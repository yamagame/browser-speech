export const Input: React.FC<{
  className?: string;
  placeholder?: string;
  value: string;
  onChange: React.ChangeEventHandler;
}> = ({ className, value, placeholder = "", onChange }) => {
  return (
    <input
      type="text"
      value={value}
      className={`border rounded-lg p-2 focus:outline-none ${className}`}
      placeholder={placeholder}
      onChange={onChange}
    />
  );
};
