interface GoldenLineProps {
    className?: string;
  }
  
  export const GoldenLine = ({ className = "" }: GoldenLineProps) => {
    return (
      <div className={`golden-line h-px w-full ${className}`} />
    );
  };