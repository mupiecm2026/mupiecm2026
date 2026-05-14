// app/page.tsx
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

import CategoryCarousel from "../components/Products/CategoryCarousel";
import HeroSearch from "../components/Layout/HeroSearch";
import ProductFilters from "../components/Products/ProductFilters";

export default function HomePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [sortBy, setSortBy] = useState("title");
  const [page, setPage] = useState(1);

  const ITEMS_PER_CATEGORY = 8;

  const EXCLUDED_CATEGORIES = ["groceries", "furniture"];

  const productsUrl = `${process.env.NEXT_PUBLIC_PRODUCTS_URL}/products?limit=200`;

  useEffect(() => {
    let mounted = true;

    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!productsUrl) {
          setError("A URL dos produtos não está configurada.");
          return;
        }

        const cacheKey = "mupi_products_cache_v2";

        try {
          const cached = sessionStorage.getItem(cacheKey);

          if (cached && mounted) {
            setProducts(JSON.parse(cached));
          }
        } catch {}

        const res = await fetch(productsUrl);

        if (!res.ok) {
          throw new Error("Erro ao carregar produtos");
        }

        const data : any = await res.json();

        const mapped = (data.products || [])
          .map((p: any) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            price: (p.price || 0) * 8,
            image: p.thumbnail || p.images?.[0] || null,
            category: p.category,
            raw: p,
          }))
          .filter((product: any) => {
            const category = String(product.category || "").toLowerCase();

            return !EXCLUDED_CATEGORIES.includes(category);
          });

        if (!mounted) return;

        setProducts(mapped);

        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(mapped));
        } catch {}
      } catch (err) {
        console.error(err);

        if (mounted) {
          setError("Não foi possível carregar os produtos.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      mounted = false;
    };
  }, [productsUrl]);

  const categories = useMemo(() => {
    return [...new Set(products.map((p) => p.category))]
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b)));
  }, [products]);

  const filteredAndSorted = useMemo(() => {
    const filtered = products.filter((p: any) => {
      const matchesQuery =
        !query.trim() ||
        String(p.title || "")
          .toLowerCase()
          .includes(query.trim().toLowerCase());

      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(p.category);

      const matchesPrice =
        p.price >= priceRange[0] && p.price <= priceRange[1];

      return matchesQuery && matchesCategory && matchesPrice;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return a.price - b.price;

        case "price-desc":
          return b.price - a.price;

        case "title":
        default:
          return String(a.title || "").localeCompare(
            String(b.title || "")
          );
      }
    });

    return filtered;
  }, [products, query, selectedCategories, priceRange, sortBy]);

  const groupedCategories = useMemo(() => {
    const grouped = new Map<string, any[]>();

    for (const product of filteredAndSorted) {
      const category = String(product.category || "Sem categoria");

      if (!grouped.has(category)) {
        grouped.set(category, []);
      }

      grouped.get(category)!.push(product);
    }

    return grouped;
  }, [filteredAndSorted]);

  const paginatedCategories = useMemo(() => {
    const result: {
      category: string;
      items: any[];
    }[] = [];

    for (const [category, items] of groupedCategories.entries()) {
      const start = (page - 1) * ITEMS_PER_CATEGORY;
      const end = start + ITEMS_PER_CATEGORY;

      const sliced = items.slice(start, end);

      if (sliced.length > 0) {
        result.push({
          category,
          items: sliced,
        });
      }
    }

    return result;
  }, [groupedCategories, page]);

  const totalPages = useMemo(() => {
    let maxPages = 1;

    for (const items of groupedCategories.values()) {
      const pages = Math.ceil(items.length / ITEMS_PER_CATEGORY);

      if (pages > maxPages) {
        maxPages = pages;
      }
    }

    return maxPages;
  }, [groupedCategories]);

  useEffect(() => {
    setPage(1);
  }, [query, selectedCategories, priceRange, sortBy]);

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
      <HeroSearch
        logoSrc="/logo.png"
        title="Mupi"
        subtitle="Encontre os melhores dispositivos e acessórios"
        placeholder="Pesquisar por nome do produto..."
        onSearch={(q) => setQuery(q)}
        preferLogoBehind
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
            Tente novamente mais tarde.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={4}>
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

          <Grid item xs={12} md={9}>
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

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {filteredAndSorted.length} produto
                {filteredAndSorted.length !== 1 ? "s" : ""} encontrado
                {filteredAndSorted.length !== 1 ? "s" : ""}
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

            <CategoryCarousel
              categories={paginatedCategories}
              cardWidth={260}
              gap={16}
            />

            {totalPages > 1 && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  mt: 4,
                }}
              >
                <Pagination
                  color="primary"
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  sx={{
                    "& .Mui-selected": {
                      backgroundColor: "#22c55e !important",
                      color: "#fff",
                    },
                  }}
                />
              </Box>
            )}
          </Grid>
        </Grid>
      )}
    </Container>
  );
}