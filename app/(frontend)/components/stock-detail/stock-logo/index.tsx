"use client";

import { useState } from "react";
import Image from "next/image";
import type { StockOnlyProps } from "../../../types/stock/stock-detail";
import {
  getLogoColorClassName,
  getLogoLabel,
  isUsableImageUrl,
} from "../../../utils/stock/stock-detail";

export default function StockLogo({ stock }: StockOnlyProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const logoLabel = getLogoLabel(stock.name);
  const logoColorClassName = getLogoColorClassName(stock.id);
  const imageUrl = stock.imageUrl?.trim();
  const shouldTryImage = isUsableImageUrl(imageUrl) && !hasImageError;

  return (
    <span
      className={`relative flex size-20 shrink-0 items-center justify-center overflow-hidden border text-3xl font-bold sm:size-25 sm:text-4xl ${logoColorClassName}`}
      aria-hidden={!shouldTryImage}
    >
      {logoLabel}

      {shouldTryImage && imageUrl && (
        <Image
          alt={`${stock.name} 로고`}
          className={`absolute inset-0 size-full bg-(--cs-surface-raised) object-contain transition-opacity ${
            isImageLoaded ? "opacity-100" : "opacity-0"
          }`}
          fill
          sizes="(max-width: 639px) 80px, 100px"
          src={imageUrl}
          unoptimized
          onLoad={(event) => {
            if (
              event.currentTarget.naturalWidth <= 1 ||
              event.currentTarget.naturalHeight <= 1
            ) {
              setHasImageError(true);
              return;
            }

            setIsImageLoaded(true);
          }}
          onError={() => {
            setHasImageError(true);
            setIsImageLoaded(false);
          }}
        />
      )}
    </span>
  );
}
