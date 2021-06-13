export const Button: React.FC<{
  label: string;
  onClick: React.MouseEventHandler;
}> = ({ label, onClick }) => {
  return (
    <button
      className="border rounded-lg p-2 focus:outline-none"
      onClick={onClick}
    >
      {label}
    </button>
  );
};
