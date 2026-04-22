import ItemForm from "@/components/item-form";

export default function NewItemPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">添加新条目</h1>
      <ItemForm />
    </div>
  );
}
