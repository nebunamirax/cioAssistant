import { redirect } from "next/navigation";

export default async function ActionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/actions?selectedId=${encodeURIComponent(id)}`);
}
