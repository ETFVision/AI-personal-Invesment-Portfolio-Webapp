import Image from "next/image";

type ETFVisionLogoProps = {
  variant: "light" | "dark";
  className?: string;
  priority?: boolean;
};

const logoByVariant = {
  light: "/brand/etfvision-light-lockup.png",
  dark: "/brand/etfvision-dark-lockup.png"
} as const;

export function ETFVisionLogo({ variant, className, priority = false }: ETFVisionLogoProps) {
  return (
    <Image
      src={logoByVariant[variant]}
      alt="ETFVision"
      width={1800}
      height={540}
      priority={priority}
      className={className}
      sizes="(min-width: 768px) 240px, 160px"
    />
  );
}
