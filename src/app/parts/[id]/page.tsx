export default async function PartsIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div>Part Detail: {id}</div>;
}
