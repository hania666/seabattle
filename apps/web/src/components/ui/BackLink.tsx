interface Props {
  onClick: () => void;
  label?: string;
}

export function BackLink({ onClick, label = "Back to home" }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-sea-400 underline-offset-4 hover:text-sea-200 hover:underline"
    >
      ← {label}
    </button>
  );
}
