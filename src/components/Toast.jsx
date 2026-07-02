import { IconCheck, IconAlert, IconClose } from "./icons";

export default function Toast({ message, type = "success", onClose }) {
  if (!message) return null;
  const Icon = type === "error" ? IconAlert : IconCheck;

  return (
    <div className={`toast-box toast-${type}`} role="status">
      <span className="toast-icon">
        <Icon />
      </span>
      <span className="toast-message">{message}</span>
      <button className="toast-dismiss" onClick={onClose} aria-label="Dismiss notification">
        <IconClose />
      </button>
    </div>
  );
}
