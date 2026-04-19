type ContainerProps = {
  children: React.ReactNode;
  className?: string;
};

// TODO: swap to cn() after wu-eix
function Container({ children, className }: ContainerProps) {
  return (
    <div className={`mx-auto max-w-6xl xl:max-w-7xl px-8 ${className ?? ''}`}>
      {children}
    </div>
  );
}

export default Container;
