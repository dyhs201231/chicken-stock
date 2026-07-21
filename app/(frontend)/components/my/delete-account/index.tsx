"use client";

import { useDeleteAccount } from "@/app/(frontend)/apis/auth/mutations";
import { Modal } from "@/app/(frontend)/components/ui";
import { IconChevronRight } from "@tabler/icons-react";
import { useState } from "react";

export default function DeleteAccount() {
  const [isOpen, setIsOpen] = useState(false);
  const {
    mutate: deleteAccount,
    isPending: isDeleteAccountPending,
    isSuccess: isDeleteAccountSuccess,
  } = useDeleteAccount();

  const handleDeleteAccount = () => {
    deleteAccount();
  };

  return (
    <div className="w-full">
      <Modal.Root
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        closeOnEscape={!isDeleteAccountSuccess}
        closeOnOverlayClick={!isDeleteAccountSuccess}
        showCloseButton={false}
      >
        <h1
          className="row mb-9 w-full cursor-pointer items-center justify-between border-b border-(--cs-color-gray-500) pb-4 text-[40px]"
          onClick={() => setIsOpen(true)}
        >
          <p>회원 탈퇴</p>

          <IconChevronRight stroke={2} size={50} />
        </h1>

        <Modal.Overlay>
          <Modal.Content className="h-[350px] w-[650px]">
            <div className="flex h-full flex-col items-center justify-center gap-4 text-xl">
              {!isDeleteAccountSuccess && (
                <>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-(--cs-text-strong)">정말 탈퇴하시겠습니까?</p>
                    <p className="mt-2 text-sm text-(--cs-text-muted)">탈퇴 후에는 계정 정보를 복구할 수 없습니다.</p>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button
                      type="button"
                      className="min-h-10 cursor-pointer rounded-lg bg-red-600 px-5 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={isDeleteAccountPending}
                      onClick={handleDeleteAccount}
                    >
                      예
                    </button>

                    <button
                      type="button"
                      className="min-h-10 cursor-pointer rounded-lg border border-(--cs-border-strong) bg-(--cs-surface-base) px-5 font-semibold text-(--cs-text-default) transition hover:bg-(--cs-brand-50) disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={isDeleteAccountPending}
                      onClick={() => setIsOpen(false)}
                    >
                      아니오
                    </button>
                  </div>
                </>
              )}

              {isDeleteAccountSuccess && (
                <>
                  <div className="text-center">
                    <p>회원 탈퇴가 완료되었습니다.</p>
                    <p>이용해 주셔서 감사합니다.</p>
                  </div>

                  <button
                    type="button"
                    className="mt-4 min-h-10 cursor-pointer rounded-lg bg-(--cs-brand-700) px-5 font-semibold text-white transition hover:bg-(--cs-brand-800)"
                    onClick={() => window.location.replace("/")}
                  >
                    확인
                  </button>
                </>
              )}
            </div>
          </Modal.Content>
        </Modal.Overlay>
      </Modal.Root>
    </div>
  );
}
