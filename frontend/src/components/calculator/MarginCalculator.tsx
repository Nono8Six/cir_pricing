import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calculator, ShoppingCart, TrendingUp, Check, Info, EuroIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

export const MarginCalculator: React.FC = () => {
  // États pour les prix d'achat
  const [directPurchasePrice, setDirectPurchasePrice] = useState<string>('');
  const [supplierTariff, setSupplierTariff] = useState<string>('');
  const [standardDiscount, setStandardDiscount] = useState<string>('');
  const [hasDerogation, setHasDerogation] = useState(false);
  const [derogatedNetPrice, setDerogatedNetPrice] = useState<string>('');
  const [derogatedDiscount, setDerogatedDiscount] = useState<string>('');

  // États pour les prix de vente
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [targetMarkupRate, setTargetMarkupRate] = useState<string>('30');
  const [cirDiscount, setCirDiscount] = useState<string>('');

  // États calculés
  const [purchasePrices, setPurchasePrices] = useState<{
    direct: number | null;
    tariffWithDiscount: number | null;
    derogatedNet: number | null;
    derogatedTariff: number | null;
    final: number;
    bestMethod: string;
  }>({
    direct: null,
    tariffWithDiscount: null,
    derogatedNet: null,
    derogatedTariff: null,
    final: 0,
    bestMethod: ''
  });

  const [finalSellingPrice, setFinalSellingPrice] = useState<number>(0);
  const [margins, setMargins] = useState<{
    margin_amount: number;
    markup_rate: number;
    coefficient: number;
  } | null>(null);

  const calculatePurchasePrices = () => {
    const prices = {
      direct: parseFloat(directPurchasePrice) || null,
      tariffWithDiscount: null as number | null,
      derogatedNet: null as number | null,
      derogatedTariff: null as number | null,
      final: 0,
      bestMethod: ''
    };

    // Prix avec tarif + remise standard
    if (parseFloat(supplierTariff) > 0 && parseFloat(standardDiscount) >= 0) {
      prices.tariffWithDiscount = parseFloat(supplierTariff) * (1 - (parseFloat(standardDiscount) || 0) / 100);
    }

    // Prix dérogés (seulement si dérogation activée)
    if (hasDerogation) {
      if (parseFloat(derogatedNetPrice) > 0) {
        prices.derogatedNet = parseFloat(derogatedNetPrice);
      }
      if (parseFloat(supplierTariff) > 0 && parseFloat(derogatedDiscount) > 0) {
        prices.derogatedTariff = parseFloat(supplierTariff) * (1 - parseFloat(derogatedDiscount) / 100);
      }
    }

    // Trouver le meilleur prix (le plus bas)
    const validPrices = [
      { price: prices.direct, method: 'Prix direct' },
      { price: prices.tariffWithDiscount, method: 'Tarif + remise' },
      { price: prices.derogatedNet, method: 'Prix dérogé' },
      { price: prices.derogatedTariff, method: 'Tarif dérogé' }
    ].filter(p => p.price !== null && p.price > 0);

    if (validPrices.length > 0) {
      const bestPrice = validPrices.reduce((min, current) => 
        current.price! < min.price! ? current : min
      );
      prices.final = bestPrice.price!;
      prices.bestMethod = bestPrice.method;
    }

    setPurchasePrices(prices);
    return prices.final;
  };

  const calculateSellingPrice = (purchasePrice: number) => {
    let finalPrice = 0;

    // Si prix de vente saisi manuellement
    if (parseFloat(sellingPrice) > 0 && sellingPrice !== '') {
      finalPrice = parseFloat(sellingPrice);
      // Calculer la remise CIR basée sur le prix de vente
      if (parseFloat(supplierTariff) > 0) {
        const calculatedCirDiscount = ((parseFloat(supplierTariff) - finalPrice) / parseFloat(supplierTariff)) * 100;
        if (Math.abs(calculatedCirDiscount - parseFloat(cirDiscount)) > 0.1) {
          setCirDiscount(calculatedCirDiscount.toFixed(1));
        }
      }
      // Calculer le taux de marque basé sur le prix de vente
      if (purchasePrice > 0) {
        const calculatedMarkup = ((finalPrice - purchasePrice) / finalPrice) * 100;
        if (Math.abs(calculatedMarkup - parseFloat(targetMarkupRate)) > 0.1) {
          setTargetMarkupRate(calculatedMarkup.toFixed(1));
        }
      }
    }
    // Si remise CIR saisie manuellement
    else if (parseFloat(cirDiscount) > 0 && parseFloat(supplierTariff) > 0) {
      finalPrice = parseFloat(supplierTariff) * (1 - parseFloat(cirDiscount) / 100);
      if (Math.abs(finalPrice - parseFloat(sellingPrice)) > 0.01) {
        setSellingPrice(finalPrice.toFixed(2));
      }
      // Calculer le taux de marque basé sur la remise CIR
      if (purchasePrice > 0) {
        const calculatedMarkup = ((finalPrice - purchasePrice) / finalPrice) * 100;
        if (Math.abs(calculatedMarkup - parseFloat(targetMarkupRate)) > 0.1) {
          setTargetMarkupRate(calculatedMarkup.toFixed(1));
        }
      }
    }
    // Si taux de marque cible saisi (par défaut 30% ou modifié)
    else if (parseFloat(targetMarkupRate) > 0 && purchasePrice > 0) {
      // Formule inversée pour le taux de marque : Prix de vente = Prix d'achat / (1 - taux de marque / 100)
      finalPrice = purchasePrice / (1 - parseFloat(targetMarkupRate) / 100);
      if (Math.abs(finalPrice - parseFloat(sellingPrice)) > 0.01) {
        setSellingPrice(finalPrice.toFixed(2));
      }
      // Calculer la remise CIR basée sur le taux de marque
      if (parseFloat(supplierTariff) > 0) {
        const calculatedCirDiscount = ((parseFloat(supplierTariff) - finalPrice) / parseFloat(supplierTariff)) * 100;
        if (Math.abs(calculatedCirDiscount - parseFloat(cirDiscount)) > 0.1) {
          setCirDiscount(calculatedCirDiscount.toFixed(1));
        }
      }
    }

    setFinalSellingPrice(finalPrice);
    return finalPrice;
  };

  const calculateMargins = (purchase: number, selling: number) => {
    if (purchase > 0 && selling > 0) {
      const marginAmount = selling - purchase;
      // Taux de marque = (Marge brute / Prix de vente) × 100
      const markupRate = (marginAmount / selling) * 100;
      const coefficient = selling / purchase;

      setMargins({
        margin_amount: marginAmount,
        markup_rate: markupRate,
        coefficient
      });
    } else {
      setMargins(null);
    }
  };

  useEffect(() => {
    const purchase = calculatePurchasePrices();
    const selling = calculateSellingPrice(purchase);
    calculateMargins(purchase, selling);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    directPurchasePrice, supplierTariff, standardDiscount, hasDerogation,
    derogatedNetPrice, derogatedDiscount, sellingPrice, targetMarkupRate, cirDiscount
  ]);

  const getMarkupColor = (rate: number) => {
    if (rate < 15) return 'text-red-500';
    if (rate < 30) return 'text-orange-500';
    return 'text-green-500';
  };

  const getMarkupBadgeColor = (rate: number) => {
    if (rate < 15) return 'bg-red-50 text-red-700 border-red-200';
    if (rate < 30) return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-green-50 text-green-700 border-green-200';
  };

  const getPriceDisplay = (price: number | null, isBest: boolean) => {
    if (price === null || price <= 0) return { value: '0.00 €', color: 'text-gray-400' };
    return {
      value: `${price.toFixed(2)} €`,
      color: isBest ? 'text-green-600 font-semibold' : 'text-gray-600'
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-full max-w-6xl mx-auto shadow-lg border-gray-200">
        <CardHeader className="pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-2 bg-gradient-to-r from-cir-red to-cir-red-light rounded-lg shadow-sm">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-semibold text-text">
                  Calculateur de Prix et Marge
                </CardTitle>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 hidden sm:block">
                  Calcul automatique avec comparaison intelligente des prix d'achat
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-3 sm:p-4 lg:p-6">
          {/* Layout principal en grid 2 colonnes sur desktop, 1 sur mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            
            {/* SECTION ACHAT */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-blue-50 to-blue-50/50 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 border border-blue-200"
            >
              <div className="flex items-center space-x-2 mb-3 sm:mb-4">
                <div className="p-1.5 bg-blue-500 rounded-lg shadow-sm">
                  <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-blue-900">Achat</h3>
              </div>

              {/* Prix d'achat en grid aligné */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                {/* Prix direct */}
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-medium text-blue-800">
                    Prix direct HT
                    <Info className="inline w-2.5 h-2.5 sm:w-3 sm:h-3 ml-1 text-blue-600" />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={directPurchasePrice}
                      onChange={(e) => {
                        setDirectPurchasePrice(e.target.value);
                      }}
                      className="w-full h-10 px-3 pr-8 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-cir-red bg-white transition-all duration-200 hover:border-blue-300"
                      placeholder="0.00"
                    />
                    <EuroIcon className="absolute right-1.5 sm:right-2.5 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                  </div>
                  <div className={`text-xs ${getPriceDisplay(purchasePrices.direct, purchasePrices.final === purchasePrices.direct).color} hidden sm:block`}>
                    {getPriceDisplay(purchasePrices.direct, purchasePrices.final === purchasePrices.direct).value}
                    {purchasePrices.final === purchasePrices.direct && purchasePrices.direct && <span className="ml-1">✓</span>}
                  </div>
                </div>

                {/* Tarif fabricant */}
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-medium text-blue-800">
                    Tarif fabricant HT
                    <Info className="inline w-2.5 h-2.5 sm:w-3 sm:h-3 ml-1 text-blue-600" />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={supplierTariff}
                      onChange={(e) => {
                        setSupplierTariff(e.target.value);
                      }}
                      className="w-full h-8 sm:h-9 lg:h-10 px-2 sm:px-3 pr-6 sm:pr-8 text-xs sm:text-sm border border-blue-200 rounded-md sm:rounded-lg focus:ring-1 sm:focus:ring-2 focus:ring-cir-red focus:border-cir-red bg-white transition-all duration-200 hover:border-blue-300"
                      placeholder="0.00"
                    />
                    <EuroIcon className="absolute right-1.5 sm:right-2.5 top-1/2 transform -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                  </div>
                  <div className={`text-xs ${getPriceDisplay(purchasePrices.tariffWithDiscount, purchasePrices.final === purchasePrices.tariffWithDiscount).color} hidden sm:block`}>
                    {getPriceDisplay(purchasePrices.tariffWithDiscount, purchasePrices.final === purchasePrices.tariffWithDiscount).value}
                    {purchasePrices.final === purchasePrices.tariffWithDiscount && purchasePrices.tariffWithDiscount && <span className="ml-1">✓</span>}
                  </div>
                </div>
              </div>

              {/* Remise standard */}
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm font-medium text-blue-800 mb-2">
                  Remise standard
                  <Info className="inline w-2.5 h-2.5 sm:w-3 sm:h-3 ml-1 text-blue-600" />
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={standardDiscount}
                    onChange={(e) => {
                      setStandardDiscount(e.target.value);
                    }}
                    className="w-full h-10 px-3 pr-8 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-cir-red bg-white transition-all duration-200 hover:border-blue-300"
                  />
                  <span className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-sm text-gray-400">%</span>
                </div>
              </div>

              {/* Checkbox dérogation alignée à gauche */}
              <div className="flex items-center space-x-2 sm:space-x-3 mb-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setHasDerogation(!hasDerogation)}
                  className={`flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded border-2 transition-all duration-200 ${
                    hasDerogation 
                      ? 'bg-cir-red border-cir-red text-white shadow-sm' 
                      : 'border-gray-300 bg-white hover:border-cir-red/50'
                  }`}
                >
                  {hasDerogation && <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                </motion.button>
                <label 
                  className="text-xs sm:text-sm font-medium text-gray-700 cursor-pointer select-none" 
                  onClick={() => setHasDerogation(!hasDerogation)}
                >
                  Dérogation achat
                </label>
              </div>

              {/* Section dérogation avec animation */}
              {hasDerogation && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 p-2 sm:p-3 bg-orange-50/50 rounded border border-orange-200"
                >
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-orange-700">Prix net dérogé</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={derogatedNetPrice}
                        onChange={(e) => setDerogatedNetPrice(e.target.value)}
                        className="w-full h-8 sm:h-9 px-2 sm:px-3 pr-6 text-xs sm:text-sm border border-orange-200 rounded focus:ring-1 focus:ring-cir-red focus:border-cir-red bg-white transition-all duration-200"
                        placeholder="0.00"
                      />
                      <EuroIcon className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                    </div>
                    <div className={`text-xs ${getPriceDisplay(purchasePrices.derogatedNet, purchasePrices.final === purchasePrices.derogatedNet).color}`}>
                      {getPriceDisplay(purchasePrices.derogatedNet, purchasePrices.final === purchasePrices.derogatedNet).value}
                      {purchasePrices.final === purchasePrices.derogatedNet && purchasePrices.derogatedNet && <span className="ml-1">✓</span>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-orange-700">Remise dérogée</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={derogatedDiscount}
                        onChange={(e) => setDerogatedDiscount(e.target.value)}
                        className="w-full h-8 sm:h-9 px-2 sm:px-3 pr-6 text-xs sm:text-sm border border-orange-200 rounded focus:ring-1 focus:ring-cir-red focus:border-cir-red bg-white transition-all duration-200"
                        placeholder="0.0"
                      />
                      <span className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm text-gray-400">%</span>
                    </div>
                    <div className={`text-xs ${getPriceDisplay(purchasePrices.derogatedTariff, purchasePrices.final === purchasePrices.derogatedTariff).color}`}>
                      {getPriceDisplay(purchasePrices.derogatedTariff, purchasePrices.final === purchasePrices.derogatedTariff).value}
                      {purchasePrices.final === purchasePrices.derogatedTariff && purchasePrices.derogatedTariff && <span className="ml-1">✓</span>}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Prix d'achat final - Full width blue card */}
              <motion.div
                whileHover={{ scale: 1.02, boxShadow: "0 8px 25px rgba(59, 130, 246, 0.15)" }}
                className="w-full min-h-[60px] sm:min-h-[70px] lg:min-h-[80px] bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white text-center flex flex-col justify-center shadow-md"
              >
                <p className="text-xs opacity-90 mb-0.5 sm:mb-1">Prix d'achat final</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold">{purchasePrices.final.toFixed(2)} € HT</p>
                <p className="text-xs opacity-75 hidden sm:block">{purchasePrices.bestMethod || 'Aucun prix'}</p>
              </motion.div>
            </motion.div>

            {/* SECTION VENTE */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-green-50 to-green-50/50 rounded-lg p-3 sm:p-4 border border-green-200"
            >
              <div className="flex items-center space-x-2 mb-3">
                <div className="p-1.5 bg-green-500 rounded-lg shadow-sm">
                  <TrendingUp className="w-3 h-3 text-white" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-green-900">Vente</h3>
              </div>

              {/* Inputs de vente en grid aligné */}
              <div className="grid grid-cols-1 gap-2 sm:gap-3 mb-3">
                {/* Prix de vente */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-green-800">
                    Prix de vente HT
                    <Info className="inline w-2.5 h-2.5 ml-1 text-green-600" />
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={sellingPrice}
                      onChange={(e) => {
                        setSellingPrice(e.target.value);
                      }}
                      className="w-full h-8 sm:h-9 px-2 sm:px-3 pr-6 text-xs sm:text-sm border border-green-200 rounded focus:ring-1 focus:ring-cir-red focus:border-cir-red bg-white transition-all duration-200 hover:border-green-300"
                      placeholder="Calculé automatiquement"
                    />
                    <EuroIcon className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                  </div>
                </div>

                {/* Taux de marque cible et Remise CIR en grid 2 colonnes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-green-800">
                      OU Taux de marque cible
                      <Info className="inline w-2.5 h-2.5 ml-1 text-green-600" />
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={targetMarkupRate}
                        onChange={(e) => {
                          setTargetMarkupRate(e.target.value);
                        }}
                        className="w-full h-10 px-3 pr-8 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-cir-red focus:border-cir-red bg-white transition-all duration-200 hover:border-green-300"
                        placeholder="30.0"
                      />
                      <span className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm text-gray-400">%</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-green-800">
                      OU Remise CIR
                      <Info className="inline w-2.5 h-2.5 ml-1 text-green-600" />
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={cirDiscount}
                        onChange={(e) => {
                          setCirDiscount(e.target.value);
                        }}
                        className="w-full h-8 sm:h-9 px-2 sm:px-3 pr-6 text-xs sm:text-sm border border-green-200 rounded focus:ring-1 focus:ring-cir-red focus:border-cir-red bg-white transition-all duration-200 hover:border-green-300"
                        placeholder="Calculée automatiquement"
                      />
                      <span className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm text-gray-400">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Prix de vente final - Green card même taille que achat */}
              <motion.div
                whileHover={{ scale: 1.02, boxShadow: "0 8px 25px rgba(34, 197, 94, 0.15)" }}
                className="w-full min-h-[60px] sm:min-h-[70px] lg:min-h-[80px] bg-gradient-to-r from-green-500 to-green-600 rounded-lg text-white text-center flex flex-col justify-center shadow-md mb-3"
              >
                <p className="text-xs opacity-90 mb-0.5 sm:mb-1">Prix de vente final</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold">{finalSellingPrice.toFixed(2)} € HT</p>
              </motion.div>

              {/* Indicateurs de marge en grid */}
              {margins && (
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="p-2 sm:p-3 bg-white rounded border border-gray-200 text-center">
                    <p className="text-xs text-gray-600 mb-1">Marge brute</p>
                    <p className="text-xs sm:text-sm font-semibold text-gray-900">{margins.margin_amount.toFixed(2)} €</p>
                  </div>
                  <div className="p-2 sm:p-3 bg-white rounded border border-gray-200 text-center">
                    <p className="text-xs text-gray-600 mb-1">Coefficient</p>
                    <p className="text-xs sm:text-sm font-semibold text-gray-900">{margins.coefficient.toFixed(2)}</p>
                  </div>
                  <div className={`col-span-2 p-2 sm:p-3 rounded border text-center ${getMarkupBadgeColor(margins.markup_rate)}`}>
                    <p className="text-xs opacity-75 mb-1">Taux de marque (sur prix de vente)</p>
                    <p className={`text-sm sm:text-lg font-bold ${getMarkupColor(margins.markup_rate)}`}>
                      {margins.markup_rate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Légende des marques - Alignée horizontalement */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 lg:gap-6 mt-3 sm:mt-4 lg:mt-6 p-2 sm:p-3 bg-gray-50 rounded border border-gray-200"
          >
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs font-medium text-gray-700">
                <span className="hidden sm:inline">{'< 15%'} : Marque faible</span>
                <span className="sm:hidden">{'< 15%'}</span>
              </span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-xs font-medium text-gray-700">
                <span className="hidden sm:inline">15-30% : Marque correcte</span>
                <span className="sm:hidden">15-30%</span>
              </span>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs font-medium text-gray-700">
                <span className="hidden sm:inline">{'> 30%'} : Marque excellente</span>
                <span className="sm:hidden">{'> 30%'}</span>
              </span>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};