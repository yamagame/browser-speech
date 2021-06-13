export const Input: React.FC<{
  placeholder?: string;
  value: string;
  onChange: React.ChangeEventHandler;
}> = ({ value, placeholder = "", onChange }) => {
  return (
    <input
      type="text"
      value={value}
      className="border rounded-lg p-2 focus:outline-none"
      placeholder={placeholder}
      onChange={onChange}
    />
  );
};
