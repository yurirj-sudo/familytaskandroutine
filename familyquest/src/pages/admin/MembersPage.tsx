import AppLayout from '../../components/layout/AppLayout';

const MembersPage = () => (
  <AppLayout title="Membros">
    <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud text-center py-12 mt-4">
      <div className="text-5xl mb-4">👨‍👩‍👧</div>
      <h3 className="font-headline font-bold text-on-surface text-lg">Membros da Família</h3>
      <p className="text-on-surface-variant text-sm mt-2">Gerenciamento de membros — Fase 2</p>
    </div>
  </AppLayout>
);

export default MembersPage;
