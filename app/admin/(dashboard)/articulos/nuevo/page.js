import ItemForm from '../../../../../components/admin/ItemForm.js'

export const metadata = {
  title: 'Nuevo artículo · Administración',
}

export default function NuevoArticuloPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold text-primary">Nuevo artículo</h1>
      <ItemForm />
    </div>
  )
}
