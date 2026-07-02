import { IconAlert } from "./icons";

export default function ConfirmModal({ open, title, message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="modal-card">
        <div className={`modal-icon ${danger ? "modal-icon-danger" : ""}`}>
          <IconAlert />
        </div>
        <h3 id="confirm-modal-title">{title}</h3>
        <div className="modal-message">{message}</div>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onCancel}>
            Cancel
          </button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
