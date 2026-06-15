import type { ExternalToast } from "sonner";

async function getToast() {
  return (await import("sonner")).toast;
}

export async function showSuccessToast(
  message: string,
  options?: ExternalToast,
) {
  const toast = await getToast();
  toast.success(message, options);
}

export async function showErrorToast(message: string, options?: ExternalToast) {
  const toast = await getToast();
  toast.error(message, options);
}

export async function showWarningToast(
  message: string,
  options?: ExternalToast,
) {
  const toast = await getToast();
  toast.warning(message, options);
}
