"use client";

import { ReactNode } from "react";

type NoticeModalProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  buttonLabel?: string;
  onClose: () => void;
};

export default function NoticeModal({
  open,
  title,
  description,
  buttonLabel = "OK",
  onClose,
}: NoticeModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="company-confirm-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="company-confirm-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-notice-modal-title"
      >
        <div className="company-confirm-modal-icon">
          !
        </div>

        <div className="company-confirm-modal-content">
          <h2 id="company-notice-modal-title">
            {title}
          </h2>

          <div className="company-confirm-modal-description">
            {description}
          </div>
        </div>

        <div className="company-confirm-modal-actions">
          <button
            type="button"
            className="company-confirm-modal-delete"
            onClick={onClose}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
