import { KVStore } from "./kv-store.interface";

export class LocalKVStore implements KVStore {
  private filePath: string | null = null;
  // Guardamos as referências dos módulos carregados para evitar múltiplos imports
  private nodeFs: any = null;
  private nodePath: any = null;

  constructor() {
    // No construtor não fazemos nada que envolva o sistema de arquivos
    // para evitar que o Cloudflare tente resolver caminhos no build.
  }

  /**
   * Inicializa os módulos do Node.js de forma dinâmica.
   * Só será chamado dentro dos métodos se necessário.
   */
  private async init() {
    if (this.nodeFs && this.nodePath) return;

    const fsModuleName = "fs";
    const pathModuleName = "path";

    try {
      this.nodeFs = await import(fsModuleName);
      this.nodePath = await import(pathModuleName);
      
      // 🛡️ A "Mágica": Acessamos o global de forma indireta
      // Isso impede o Turbopack de marcar o erro no build
      const globalObj = globalThis as any;
      const currentDir = globalObj.process?.cwd?.() || ""; 

      if (!currentDir) {
        throw new Error("Não foi possível determinar o diretório atual (Não é Node.js)");
      }

      this.filePath = this.nodePath.resolve(currentDir, "data/kv-store.json");
      const dir = this.nodePath.dirname(this.filePath);

      if (!this.nodeFs.existsSync(dir)) {
        this.nodeFs.mkdirSync(dir, { recursive: true });
      }

      if (!this.nodeFs.existsSync(this.filePath)) {
        this.nodeFs.writeFileSync(this.filePath, JSON.stringify({}, null, 2));
      }
    } catch (error) {
      // No Cloudflare, ele cairá aqui silenciosamente ou você trata o erro
      throw new Error("LocalKVStore: Sistema de arquivos indisponível neste ambiente.");
    }
  }
  
  private read(): Record<string, any> {
    // Nota: Como read() é síncrono no seu código original, 
    // mas o import é assíncrono, os métodos públicos devem garantir o init().
    const raw = this.nodeFs.readFileSync(this.filePath!, "utf-8") || "{}";
    return JSON.parse(raw);
  }

  private write(data: Record<string, any>) {
    this.nodeFs.writeFileSync(this.filePath!, JSON.stringify(data, null, 2));
  }

  private isStoredRecord(value: any): value is { value: any; expiresAt?: number | null } {
    return (
      typeof value === "object" &&
      value !== null &&
      Object.prototype.hasOwnProperty.call(value, "value")
    );
  }

  async get(key: string): Promise<string | null> {
    await this.init();
    const data = this.read();
    const value = data[key];

    if (!value) return null;

    if (this.isStoredRecord(value)) {
      if (value.expiresAt && Date.now() > value.expiresAt) {
        delete data[key];
        this.write(data);
        return null;
      }

      const storedValue = value.value;
      if (typeof storedValue === "string") {
        return storedValue;
      }

      try {
        return JSON.stringify(storedValue);
      } catch {
        return String(storedValue);
      }
    }

    if (typeof value === "string") {
      try {
        return JSON.stringify(JSON.parse(value));
      } catch {
        return value;
      }
    }

    return JSON.stringify(value);
  }

  async put(
    key: string,
    value: string,
    options?: { expirationTtl?: number }
  ): Promise<void> {
    await this.init();
    const data = this.read();

    const parsedValue = (() => {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    })();

    const existing = data[key];
    let mergedValue: any = parsedValue;

    const existingValue = this.isStoredRecord(existing)
      ? existing.value
      : existing;

    if (
      typeof existingValue === "object" &&
      existingValue !== null &&
      typeof parsedValue === "object" &&
      parsedValue !== null
    ) {
      mergedValue = { ...existingValue, ...parsedValue };
    }

    const expiresAt = options?.expirationTtl
      ? Date.now() + options.expirationTtl * 1000
      : null;

    data[key] = {
      value: mergedValue,
      expiresAt,
    };

    this.write(data);
  }

  async delete(key: string): Promise<void> {
    await this.init();
    const data = this.read();
    delete data[key];
    this.write(data);
  }

  async list(options: { prefix?: string; limit?: number } = { prefix: "", limit: 50 }): Promise<{ keys: Array<{ name: string }> }> {
    await this.init();
    const data = this.read();
    const prefix = options.prefix || "";
    const limit = options.limit || 50;

    const keys = Object.keys(data)
      .filter((key) => key.startsWith(prefix))
      .slice(0, limit)
      .map((name) => ({ name }));

    return { keys };
  }
}
