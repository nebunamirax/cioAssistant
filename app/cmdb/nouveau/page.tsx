import Link from "next/link";
import { CmdbItemForm } from "@/components/cmdb/item-form";
import { configurationOptions } from "@/lib/services/cmdb-service";

export default async function NewConfigurationItemPage() {
  const options = await configurationOptions();
  return <div className="space-y-4">
    <header className="workbench-header">
      <div>
        <Link href="/cmdb" className="pilot-row-link">Retour à la CMDB</Link>
        <h1 className="text-2xl font-semibold">Nouvel élément de configuration</h1>
      </div>
    </header>
    <section className="workbench-panel max-w-3xl"><CmdbItemForm options={options} /></section>
  </div>;
}
