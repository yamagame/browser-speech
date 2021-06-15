export const Button: React.FC<{
  className?: string;
  label: string;
  onClick?: React.MouseEventHandler;
}> = ({ className, label, onClick }) => {
  return (
    <button
      className={`border rounded-lg p-2 focus:outline-none ${className}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
};
