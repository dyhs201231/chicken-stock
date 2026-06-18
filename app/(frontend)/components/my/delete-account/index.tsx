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
                  <p>정말 탈퇴하시겠습니까?</p>

                  <div className="flex gap-10">
                    <button
                      type="button"
                      className="w-15 cursor-pointer disabled:cursor-not-allowed disabled:text-black/40"
                      disabled={isDeleteAccountPending}
                      onClick={handleDeleteAccount}
                    >
                      예
                    </button>

                    <button
                      type="button"
                      className="w-15 cursor-pointer disabled:cursor-not-allowed disabled:text-black/40"
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
                    className="w-15 cursor-pointer"
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
