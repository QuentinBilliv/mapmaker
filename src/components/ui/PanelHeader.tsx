"use client";

export default function PanelHeader({
  title,
  onClose,
  action,
}: {
  title: string;
  onClose?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      {action}
      {onClose && (
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          ✕
        </button>
      )}
    </div>
  );
}
