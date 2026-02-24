interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = "", hover = false }: CardProps) {
  return (
    <div
      className={`bg-ws-white rounded-[8px] shadow-[var(--shadow-ws)] ${
        hover ? "transition-shadow hover:shadow-[var(--shadow-ws-md)]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
