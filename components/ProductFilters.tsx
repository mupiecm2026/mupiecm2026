"use client";
import React, { useState } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  Slider,
  Button,
  Drawer,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ExpandMore, FilterList } from "@mui/icons-material";

interface ProductFiltersProps {
  categories: string[];
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  onClearFilters: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ProductFilters({
  categories,
  selectedCategories,
  onCategoriesChange,
  priceRange,
  onPriceRangeChange,
  onClearFilters,
  isOpen,
  onToggle,
}: ProductFiltersProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleCategoryChange = (category: string, checked: boolean) => {
    if (checked) {
      onCategoriesChange([...selectedCategories, category]);
    } else {
      onCategoriesChange(selectedCategories.filter(c => c !== category));
    }
  };

  const FiltersContent = () => (
    <Box sx={{ p: 2, width: isMobile ? '100%' : 300 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Filtros
      </Typography>

      {/* Categories */}
      <Accordion defaultExpanded sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Categoria
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            {categories.map((category) => (
              <FormControlLabel
                key={category}
                control={
                  <Checkbox
                    checked={selectedCategories.includes(category)}
                    onChange={(e) => handleCategoryChange(category, e.target.checked)}
                  />
                }
                label={category}
                sx={{ display: 'block', mb: 1 }}
              />
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Price Range */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Faixa de Preço
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ px: 2 }}>
            <Slider
              value={priceRange}
              onChange={(_, newValue) => onPriceRangeChange(newValue as [number, number])}
              valueLabelDisplay="auto"
              min={0}
              max={10000}
              step={50}
              valueLabelFormat={(value) => `R$ ${value}`}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                R$ {priceRange[0]}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                R$ {priceRange[1]}
              </Typography>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Clear Filters */}
      <Box sx={{ mt: 3 }}>
        <Button
          variant="outlined"
          fullWidth
          onClick={onClearFilters}
          sx={{ borderRadius: 2 }}
        >
          Limpar Filtros
        </Button>
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <>
        <Button
          variant="outlined"
          startIcon={<FilterList />}
          onClick={onToggle}
          sx={{ mb: 2, borderRadius: 2 }}
        >
          Filtros
        </Button>
        <Drawer
          anchor="left"
          open={isOpen}
          onClose={onToggle}
          sx={{
            '& .MuiDrawer-paper': {
              width: '80%',
              maxWidth: 300,
            },
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <FiltersContent />
            <Box sx={{ p: 2, display: 'flex', gap: 1, mt: 'auto' }}>
              <Button
                variant="contained"
                fullWidth
                onClick={onToggle}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Aplicar filtros
              </Button>
            </Box>
          </Box>
        </Drawer>
      </>
    );
  }

  return (
    <Box sx={{ width: 300, mr: 4 }}>
      <FiltersContent />
    </Box>
  );
}