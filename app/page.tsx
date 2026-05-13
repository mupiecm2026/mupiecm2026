"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Container,
  CircularProgress,
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CategoryCarousel from "../components/CategoryCarousel";
import HeroSearch from "../components/HeroSearch";
import ProductFilters from "../components/ProductFilters";

/**
 * Página Home
 * - busca produtos da API pública
 * - exibe HeroSearch acima da listagem
 * - filtra produtos por nome, categoria, preço
 * - ordenação e paginação
 */

export default function HomePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");

  // Filters
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const EXCLUDED_CATEGORIES = ["alimentícios", "alimenticios", "alimentos"];

  // Sorting
  const [sortBy, setSortBy] = useState<string>("title");

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  const productsUrl = `${process.env.NEXT_PUBLIC_PRODUCTS_URL}/products?limit=150`;

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError(null);

      if (!productsUrl) {
        setError("A URL dos produtos não está configurada.");
        setLoading(false);
        return;
      }

      const cacheKey = "mupi_products_cache_v1";
      try {
        if (typeof window !== "undefined") {
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            setProducts(JSON.parse(cached));
          }
        }
      } catch (cacheErr) {
        console.warn("Falha ao ler cache de produtos:", cacheErr);
      }

      try {
        const res = await fetch(productsUrl, { cache: "force-cache" });
        const data: any = await res.json();
        const mapped = (data.products || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          price: p.price,
          image: p.thumbnail || p.images?.[0] || null,
          category: p.category,
          raw: p,
        }));

        const visibleProducts = mapped.filter((product: any) => {
          const category = String(product.category || "").toLowerCase();
          return !EXCLUDED_CATEGORIES.includes(category);
        });

        setProducts(visibleProducts);
        if (typeof window !== "undefined") {
          sessionStorage.setItem(cacheKey, JSON.stringify(visibleProducts));
        }
      } catch (err) {
        console.error(err);
        setError("Não foi possível carregar os produtos");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [productsUrl]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category))];
    return cats.filter(Boolean).filter((category) => {
      const value = String(category || "").toLowerCase();
      return !EXCLUDED_CATEGORIES.includes(value);
    });
  }, [products]);

  // Filter and sort products
  const filteredAndSorted = useMemo(() => {
    let filtered = products.filter((p: any) => {
      const matchesQuery = !query.trim() ||
        String(p.title || "").toLowerCase().includes(query.trim().toLowerCase());
      const matchesCategory = selectedCategories.length === 0 ||
        selectedCategories.includes(p.category);
      const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];

      return matchesQuery && matchesCategory && matchesPrice;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return a.price - b.price;
        case "price-desc":
          return b.price - a.price;
        case "title":
        default:
          return String(a.title || "").localeCompare(String(b.title || ""));
      }
    });

    return filtered;
  }, [products, query, selectedCategories, priceRange, sortBy]);

  // Paginate
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredAndSorted.slice(start, start + itemsPerPage);
  }, [filteredAndSorted, page]);

  const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);

  // Handlers
  const handleClearFilters = () => {
    setSelectedCategories([]);
    setPriceRange([0, 10000]);
    setQuery("");
    setPage(1);
  };

  const handlePageChange = (_: any, value: number) => {
    setPage(value);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4, maxWidth: 1400 }}>
      {/* Hero com logo + barra de busca */}
      <HeroSearch
        logoSrc="/logo.png"
        title="Mupi"
        subtitle="Encontre os melhores dispositivos e acessórios"
        placeholder="Pesquisar por nome do produto..."
        onSearch={(q) => setQuery(q)}
        preferLogoBehind={true}
      />

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {error}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tente recarregar a página ou verifique sua conexão.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={4}>
          {/* Filters Sidebar */}
          {!isMobile && (
            <Grid item md={3}>
              <ProductFilters
                categories={categories}
                selectedCategories={selectedCategories}
                onCategoriesChange={setSelectedCategories}
                priceRange={priceRange}
                onPriceRangeChange={setPriceRange}
                onClearFilters={handleClearFilters}
                isOpen={filtersOpen}
                onToggle={() => setFiltersOpen(!filtersOpen)}
              />
            </Grid>
          )}

          {/* Main Content */}
          <Grid item xs={12} md={9}>
            {/* Mobile Filters Toggle */}
            {isMobile && (
              <ProductFilters
                categories={categories}
                selectedCategories={selectedCategories}
                onCategoriesChange={setSelectedCategories}
                priceRange={priceRange}
                onPriceRangeChange={setPriceRange}
                onClearFilters={handleClearFilters}
                isOpen={filtersOpen}
                onToggle={() => setFiltersOpen(!filtersOpen)}
              />
            )}

            {/* Sorting and Results Count */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {filteredAndSorted.length} produto{filteredAndSorted.length !== 1 ? "s" : ""} encontrado{filteredAndSorted.length !== 1 ? "s" : ""}
              </Typography>

              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Classificar por</InputLabel>
                <Select
                  value={sortBy}
                  label="Classificar por"
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <MenuItem value="title">Nome (A-Z)</MenuItem>
                  <MenuItem value="price-asc">Menor preço</MenuItem>
                  <MenuItem value="price-desc">Maior preço</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Products Grid */}
            <CategoryCarousel products={paginatedProducts} cardWidth={260} gap={16} />

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size={isMobile ? "small" : "medium"}
                />
              </Box>
            )}
          </Grid>
        </Grid>
      )}
    </Container>
  );
}