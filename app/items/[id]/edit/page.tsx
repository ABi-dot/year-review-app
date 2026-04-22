import ItemForm from "@/components/item-form";
import { ItemType } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await prisma.item.findUnique({
    where: { id },
    include: { tags: true },
  });

  if (!item) {
    return <div className="container mx-auto py-8">条目不存在</div>;
  }

  const initialData = {
    title: item.title,
    originalTitle: item.originalTitle || "",
    creator: item.creator || "",
    type: item.type as ItemType,
    rating: item.rating?.toString() || "",
    review: item.review || "",
    finishedAt: item.finishedAt ? format(item.finishedAt, "yyyy-MM-dd") : "",
    coverUrl: item.coverUrl || "",
    externalId: item.externalId || "",
    externalUrl: item.externalUrl || "",
    tagIds: item.tags.map((t) => t.id),
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">编辑条目</h1>
      <ItemForm itemId={id} initialData={initialData} />
    </div>
  );
}
