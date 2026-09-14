"use client";

import { ReactNode } from "react";

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
};

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="company-confirm-modal-backdrop"
      onClick={onCancel}
    >
      <div
        className="company-confirm-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-confirm-modal-title"
      >
        <div className="company-confirm-modal-icon">
          !
        </div>

        <div className="company-confirm-modal-content">
          <h2 id="company-confirm-modal-title">
            {title}
          </h2>

          <div className="company-confirm-modal-description">
            {description}
          </div>
        </div>

        <div className="company-confirm-modal-actions">
          <button
            type="button"
            className="company-confirm-modal-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className="company-confirm-modal-delete"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? "Deleting..."
              : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}