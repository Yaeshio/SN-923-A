export default async function UnitsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div>Units for Project: {id}</div>;
}
