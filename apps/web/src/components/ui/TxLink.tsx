const ABSCAN = "https://sepolia.abscan.org/tx";

interface Props {
  hash: `0x${string}`;
  label?: string;
  className?: string;
}

export function TxLink({ hash, label, className }: Props) {
  return (
    <a
      href={`${ABSCAN}/${hash}`}
      target="_blank"
      rel="noreferrer"
      className={
        "font-mono text-xs underline-offset-4 hover:underline " +
        (className ?? "text-sea-200")
      }
    >
      {label ? `${label} ` : ""}
      {hash.slice(0, 10)}…{hash.slice(-6)}
    </a>
  );
}
