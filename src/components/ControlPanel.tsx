export const ControlPanel: React.FC<{
  className?: string;
}> = ({ className, children }) => {
  return (
    <div className="flex justify-center min-h-screen flex-col">
      <div className="flex justify-center">
        <div className="min-w-1/2 min-h-1/2 p-4 border rounded-xl justify-center">
          <div className="flex flex-col justify-center items-center min-h-full">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
