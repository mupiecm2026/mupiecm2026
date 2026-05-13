const fs = require('fs');
const path = require('path');

const workerPath = path.join(process.cwd(), '.open-next', 'worker.js');

try {
  if (fs.existsSync(workerPath)) {
    let content = fs.readFileSync(workerPath, 'utf8');
    const injection = 'globalThis.__ENV__ = env;';

    // Se já contém a injeção, encerra silenciosamente para não triggar watchers
    if (content.includes(injection)) {
      process.exit(0); 
    }

    const fetchSignature = 'async fetch(request, env, ctx) {';
    if (content.includes(fetchSignature)) {
      const newContent = content.replace(fetchSignature, `${fetchSignature}\n    ${injection}`);
      
      // Escreve o arquivo
      fs.writeFileSync(workerPath, newContent);
      console.log('✅ [mupi] Patch aplicado.');
    }
  }
} catch (e) {
  // Ignora erros para não travar o pipeline de build caso o arquivo suma
}