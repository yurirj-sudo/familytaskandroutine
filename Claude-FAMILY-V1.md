# FamilyQuest — Contexto do Projeto para Claude Code / Google Antigravity

## Visão Geral

**FamilyQuest** é um app PWA gamificado de gestão de rotinas e tarefas familiares.
Crianças e adolescentes ganham pontos ao completar tarefas, perdem pontos ao falhar nas
obrigatórias, e resgatam prêmios cadastrados pelos pais. O objetivo é desenvolver
responsabilidade e autonomia de forma engajante.

- **Plataforma**: Web + PWA (mobile-first, instalável no celular) — app nativo React Native planejado para fase futura
- **Multi-tenant**: Múltiplas famílias independentes no mesmo sistema
- **Manutenção**: Toda gestão feita pela interface — sem acesso ao código para operar
- **Idioma do app**: Português (Brasil)
- **Idioma do código**: Inglês (variáveis, funções, comentários)

---

## Stack Técnica

|
 Camada 
|
 Tecnologia 
|
 Versão/Detalhe 
|
|
---
|
---
|
---
|
|
 Frontend 
|
 React + Vite 
|
 React 18, Vite 5 
|
|
 Estilo 
|
 Tailwind CSS 
|
 v3, mobile-first 
|
|
 Roteamento 
|
 React Router 
|
 v6 
|
|
 Banco de dados 
|
 Firebase Firestore 
|
 SDK v9 modular 
|
|
 Autenticação 
|
 Firebase Auth 
|
 Email + senha 
|
|
 Storage 
|
 Firebase Storage 
|
 Foto-prova de tarefas 
|
|
 Hospedagem 
|
 Firebase Hosting 
|
 PWA com HTTPS 
|
|
 Notificações 
|
 Firebase Cloud Messaging 
|
 Push via service worker 
|
|
 Automações 
|
 Firebase Cloud Functions 
|
 Node.js 20 
|
|
 Gráficos 
|
 Recharts 
|
 Dashboard e performance 
|
|
 PWA 
|
 vite-plugin-pwa 
|
 Workbox, service worker 
|
|
 Estado global 
|
 Zustand 
|
 Leve, sem boilerplate 
|
|
 Formulários 
|
 React Hook Form + Zod 
|
 Validação tipada 
|

---

## Arquitetura Multi-Tenant

Cada família é completamente isolada. Toda coleção usa `familyId` como escopo.


/families/{familyId} <- Documento da família
/families/{familyId}/members/{uid} <- Membros com roles
/families/{familyId}/tasks/{taskId} <- Definições de tarefas
/families/{familyId}/completions/{id} <- Registros de conclusão
/families/{familyId}/prizes/{prizeId} <- Catálogo de prêmios
/families/{familyId}/redemptions/{id} <- Resgates de prêmios
/families/{familyId}/cycles/{id} <- Ciclos de pontuação
/users/{uid} <- Perfil global (lookup por familyId)


---

## Modelo de Dados (Firestore)

### `/families/{familyId}`
```typescript
{
  id: string;
  name: string;                         // "Família Silva"
  createdAt: Timestamp;
  createdBy: string;                    // uid do admin criador
  settings: {
    pointsMode: 'monthly_reset' | 'accumulate';
    requireTaskApproval: boolean;       // se true: filho submete → pai aprova antes de creditar pontos
    requirePhotoProof: boolean;         // exige foto ao marcar tarefa como concluída
    timezone: string;                   // "America/Sao_Paulo"
    notificationsEnabled: boolean;
  };
  inviteCode: string;                   // código de 6 chars para entrar na família
}

/users/{uid}
{
  uid: string;
  email: string;
  displayName: string;
  avatar: string;                       // emoji ou URL
  familyId: string;
  createdAt: Timestamp;
}

/families/{familyId}/members/{uid}
{
  uid: string;
  role: 'admin' | 'member' | 'viewer';
  displayName: string;
  avatar: string;
  totalPoints: number;                  // saldo atual (decrementado ao resgatar)
  lifetimePoints: number;               // total histórico ganho (nunca decrementado)
  currentStreak: number;                // dias consecutivos com todas mandatory concluídas
  longestStreak: number;                // recorde histórico de streak
  joinedAt: Timestamp;
  fcmToken?: string;
  isActive: boolean;
}

/families/{familyId}/tasks/{taskId}
{
  id: string;
  title: string;
  description?: string;
  category: string;                     // "higiene", "escola", "casa", etc.
  emoji?: string;
  type: 'mandatory' | 'optional';
  frequency: 'daily' | 'weekly' | 'monthly' | 'monthly_relative' | 'once';
  activeDays?: number[];                // [0-6], 0=Dom. Usado em 'weekly'
  dayOfMonth?: number;                  // 1-28. Usado em 'monthly'
  weekOfMonth?: 1 | 2 | 3 | 4;        // ex: 2ª semana. Usado em 'monthly_relative'
  dayOfWeekRelative?: number;           // 0-6, 0=Dom. Usado em 'monthly_relative'
  dueTime?: string;                     // "08:00" horário limite
  pointsOnComplete: number;
  pointsOnMiss: number;                 // negativo, só mandatory
  assignedTo: string[] | 'all';
  createdBy: string;
  createdAt: Timestamp;
  isActive: boolean;
  order: number;
}

Exemplo monthly_relative: weekOfMonth: 2, dayOfWeekRelative: 4 = toda 2ª quinta-feira do mês.

/families/{familyId}/completions/{id}
O status depende de family.settings.requireTaskApproval:

false: pending → completed (automático) ou missed
true: pending → submitted → approved | rejected ou missed
{
  id: string;                           // ID determinístico: "{taskId}_{uid}_{YYYY-MM-DD}"
  taskId: string;
  taskTitle: string;                    // snapshot para histórico
  taskType: 'mandatory' | 'optional';  // snapshot
  userId: string;
  familyId: string;
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'missed' | 'completed';
  pointsAwarded: number;               // creditado só após approved/completed
  photoProofUrl?: string;              // Firebase Storage URL (quando requirePhotoProof)
  completedAt?: Timestamp;
  submittedAt?: Timestamp;             // quando membro marcou como feita
  reviewedAt?: Timestamp;
  reviewedBy?: string;                 // uid do admin
  rejectionReason?: string;
  dueDate: Timestamp;
  cycleId: string;
  note?: string;
}

/families/{familyId}/prizes/{prizeId}
{
  id: string;
  title: string;
  description?: string;
  emoji?: string;
  pointsCost: number;                  // custo individual — cada prêmio tem o seu
  quantity: number | null;             // null = ilimitado
  quantityRedeemed: number;
  isAvailable: boolean;
  createdBy: string;
  createdAt: Timestamp;
  order: number;
}

/families/{familyId}/redemptions/{id}
{
  id: string;
  prizeId: string;
  prizeTitle: string;                  // snapshot
  pointsCost: number;                  // snapshot
  userId: string;
  userName: string;                    // snapshot
  familyId: string;
  status: 'approved';                  // automático — aprovado na solicitação
  redeemedAt: Timestamp;
  cycleId: string;
}

Regra: O resgate é automático via Firestore transaction. Não há aprovação manual do admin.

/families/{familyId}/cycles/{id}
{
  id: string;                          // formato: "2025-03" (ano-mês)
  familyId: string;
  userId: string;
  month: number;
  year: number;
  pointsEarned: number;
  pointsLost: number;
  pointsSpent: number;
  finalScore: number;
  tasksCompleted: number;
  tasksMissed: number;
  completionRate: number;              // 0-100
  rank?: number;                       // posição no ranking familiar no ciclo
  status: 'active' | 'closed';
  openedAt: Timestamp;
  closedAt?: Timestamp;
}

Papéis e Permissões
Admin (pai/mãe)
CRUD completo de tarefas, prêmios, categorias
Gerenciar membros (convidar, remover, alterar role)
Aprovar/rejeitar conclusões de tarefas (quando requireTaskApproval: true)
Ajuste manual de pontos de qualquer membro
Ver dashboard completo de toda a família
Configurar settings (pointsMode, requireTaskApproval, requirePhotoProof, etc.)
Encerrar ciclo mensal manualmente
Member (filho/filha)
Ver suas tarefas do dia/semana
Marcar tarefas como concluídas + enviar foto (quando exigido)
Ver próprio saldo, histórico e streak
Ver catálogo de prêmios e solicitar resgate
Ver ranking familiar e tela de desempenho comparativo
Viewer (opcional)
Somente leitura no dashboard geral
Regras de Negócio — Pontuação
Tarefa obrigatória
Concluída (e aprovada, se aplicável): +pointsOnComplete
Não concluída: pointsOnMiss (negativo)
Tarefa opcional
Concluída: +pointsOnComplete (bônus — pode compensar perdas)
Não concluída: sem penalidade
Ciclo de pontos (configurável por família)
monthly_reset: no encerramento, totalPoints volta a zero. Histórico no cycles.
accumulate: totalPoints nunca reseta, só decrementa por resgates.
Fluxo de conclusão — sem aprovação (requireTaskApproval: false)
Membro marca tarefa → status: completed → pontos creditados imediatamente

Fluxo de conclusão — com aprovação (requireTaskApproval: true)
Membro marca (+ foto se requirePhotoProof) → status: submitted → FCM push para admin
Admin aprova → status: approved → pontos creditados → FCM push para membro
Admin rejeita → status: rejected → FCM push para membro (sem pontos)
Prazo passa sem submissão → Cloud Function → status: missed → penalidade (mandatory)

Resgate de prêmios (sempre automático)
1. Membro solicita resgate
2. Firestore Transaction: verifica totalPoints >= pointsCost
3. Se OK: debita pontos + cria redemption{approved} + incrementa quantityRedeemed
4. Se não: retorna erro "Pontos insuficientes"
5. FCM push: "Resgate de [prêmio] aprovado! 🎉"

Recorrência monthly_relative — Algoritmo
// src/utils/recurrence.ts
export function isTaskDueToday(task: Task, date: Date): boolean {
  switch (task.frequency) {
    case 'daily': return true;
    case 'weekly': return task.activeDays?.includes(date.getDay()) ?? false;
    case 'monthly': return date.getDate() === task.dayOfMonth;
    case 'monthly_relative': {
      // Ex: weekOfMonth=2, dayOfWeekRelative=4 → 2ª quinta do mês
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      const firstTarget = (task.dayOfWeekRelative! - firstDay.getDay() + 7) % 7;
      const targetDate = 1 + firstTarget + (task.weekOfMonth! - 1) * 7;
      return date.getDate() === targetDate;
    }
    case 'once': return isSameDay(date, task.startDate!);
    default: return false;
  }
}

Estrutura de Arquivos
familyquest/
├── CLAUDE.md
├── .env.local
├── .env.example
├── .gitignore
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── public/
│   ├── manifest.json
│   ├── firebase-messaging-sw.js
│   └── icons/
├── functions/
│   ├── src/
│   │   ├── index.ts
│   │   ├── generateDailyCompletions.ts   // 00:01 BRT — gera completions do dia
│   │   ├── processMissedTasks.ts         // 00:05 BRT — penaliza não concluídas
│   │   ├── closeMonthCycle.ts            // dia 1 do mês — fecha ciclo
│   │   ├── onCompletionApproved.ts       // Firestore trigger — crédito de pontos
│   │   ├── sendTaskReminders.ts          // a cada 15 min — FCM por dueTime
│   │   └── sendPushNotification.ts       // helper FCM
│   └── package.json
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── firebase.ts
    ├── types/index.ts
    ├── utils/
    │   ├── recurrence.ts                 // isTaskDueToday com monthly_relative
    │   ├── points.ts
    │   └── date.ts
    ├── store/
    │   ├── authStore.ts
    │   ├── familyStore.ts
    │   └── notificationStore.ts
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useTasks.ts
    │   ├── useCompletions.ts
    │   ├── usePrizes.ts
    │   ├── usePoints.ts
    │   └── useCycle.ts
    ├── services/
    │   ├── auth.service.ts
    │   ├── family.service.ts
    │   ├── task.service.ts
    │   ├── completion.service.ts
    │   ├── prize.service.ts
    │   ├── redemption.service.ts
    │   ├── points.service.ts
    │   ├── cycle.service.ts
    │   ├── storage.service.ts            // upload foto-prova para Firebase Storage
    │   └── fcm.service.ts
    ├── components/
    │   ├── ui/
    │   │   ├── Button.tsx
    │   │   ├── Card.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Avatar.tsx
    │   │   ├── Modal.tsx
    │   │   ├── BottomSheet.tsx
    │   │   ├── PointsBadge.tsx
    │   │   └── EmptyState.tsx
    │   ├── layout/
    │   │   ├── AppLayout.tsx
    │   │   ├── AdminLayout.tsx
    │   │   ├── BottomNav.tsx
    │   │   └── TopBar.tsx
    │   ├── tasks/
    │   │   ├── TaskCard.tsx
    │   │   ├── TaskList.tsx
    │   │   ├── TaskForm.tsx
    │   │   └── CompletionButton.tsx
    │   ├── prizes/
    │   │   ├── PrizeCard.tsx
    │   │   ├── PrizeGrid.tsx
    │   │   └── RedeemModal.tsx
    │   ├── dashboard/
    │   │   ├── StatsCard.tsx
    │   │   ├── CompletionChart.tsx
    │   │   ├── RankingList.tsx
    │   │   └── PerformanceChart.tsx
    │   └── notifications/
    │       └── PushPermissionBanner.tsx
    ├── pages/
    │   ├── auth/
    │   │   ├── LoginPage.tsx
    │   │   ├── RegisterPage.tsx
    │   │   └── JoinFamilyPage.tsx
    │   ├── member/
    │   │   ├── HomePage.tsx              // tarefas do dia
    │   │   ├── TaskDetailPage.tsx
    │   │   ├── PointsPage.tsx            // saldo + histórico + gráfico mensal
    │   │   ├── PrizesPage.tsx            // loja de prêmios
    │   │   ├── PerformancePage.tsx       // desempenho próprio + ranking comparativo familiar
    │   │   └── ProfilePage.tsx
    │   └── admin/
    │       ├── DashboardPage.tsx
    │       ├── ApprovalsPage.tsx         // fila de aprovação (quando requireTaskApproval)
    │       ├── TasksPage.tsx
    │       ├── TaskFormPage.tsx
    │       ├── PrizesAdminPage.tsx
    │       ├── MembersPage.tsx
    │       ├── PointsAdjustPage.tsx
    │       └── SettingsPage.tsx
    └── router/
        ├── index.tsx
        ├── ProtectedRoute.tsx
        └── RoleRoute.tsx

Variáveis de Ambiente (.env.local)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_VAPID_KEY=

Roteamento
/login                        → LoginPage (público)
/register                     → RegisterPage - criar família (público)
/join/:inviteCode             → JoinFamilyPage (público)

/home                         → HomePage (member)
/home/tasks/:taskId           → TaskDetailPage (member)
/points                       → PointsPage (member)
/prizes                       → PrizesPage (member)
/performance                  → PerformancePage (member) — desempenho + ranking
/profile                      → ProfilePage (todos)

/admin                        → redireciona para /admin/dashboard
/admin/dashboard              → DashboardPage (admin)
/admin/approvals              → ApprovalsPage (admin) — visível quando requireTaskApproval
/admin/tasks                  → TasksPage (admin)
/admin/tasks/new              → TaskFormPage (admin)
/admin/tasks/:taskId/edit     → TaskFormPage (admin)
/admin/prizes                 → PrizesAdminPage (admin)
/admin/members                → MembersPage (admin)
/admin/members/:uid/points    → PointsAdjustPage (admin)
/admin/settings               → SettingsPage (admin)

Firebase Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }

    match /families/{familyId} {
      allow read: if isMember(familyId);
      allow write: if isAdmin(familyId);

      match /members/{uid} {
        allow read: if isMember(familyId);
        allow write: if isAdmin(familyId) || request.auth.uid == uid;
      }

      match /tasks/{taskId} {
        allow read: if isMember(familyId);
        allow write: if isAdmin(familyId);
      }

      match /completions/{completionId} {
        allow read: if isMember(familyId);
        // membro cria a própria completion e pode submeter (mudar para 'submitted')
        allow create: if isMember(familyId) &&
          request.resource.data.userId == request.auth.uid;
        allow update: if isAdmin(familyId) ||
          (request.auth.uid == resource.data.userId &&
           request.resource.data.status in ['submitted']);
        allow delete: if isAdmin(familyId);
      }

      match /prizes/{prizeId} {
        allow read: if isMember(familyId);
        allow write: if isAdmin(familyId);
      }

      match /redemptions/{redemptionId} {
        allow read: if isMember(familyId);
        allow create: if isMember(familyId) &&
          request.resource.data.userId == request.auth.uid;
        allow update, delete: if isAdmin(familyId);
      }

      match /cycles/{cycleId} {
        allow read: if isMember(familyId);
        allow write: if isAdmin(familyId);
      }
    }

    function isMember(familyId) {
      return request.auth != null &&
        exists(/databases/$(database)/documents/families/$(familyId)/members/$(request.auth.uid));
    }

    function isAdmin(familyId) {
      return isMember(familyId) &&
        get(/databases/$(database)/documents/families/$(familyId)/members/$(request.auth.uid)).data.role == 'admin';
    }
  }
}

Cloud Functions
Função	Trigger	O que faz
generateDailyCompletions	Scheduler 00:01 BRT	Para cada família, gera completions com status: pending para cada tarefa ativa × membro atribuído. ID determinístico {taskId}_{uid}_{YYYY-MM-DD} — idempotente. Usa recurrence.ts para decidir quais tarefas ocorrem hoje.
processMissedTasks	Scheduler 00:05 BRT	Marca como missed todas as completions pending ou submitted do dia anterior. Para mandatory: aplica pointsOnMiss, envia FCM.
onCompletionApproved	Firestore trigger (completions)	Quando status muda para approved ou completed: credita pontos (totalPoints + lifetimePoints), recalcula currentStreak, envia FCM ao membro.
closeMonthCycle	Scheduler dia 1 00:10 BRT	Agrega stats de cada membro no ciclo encerrado. Se monthly_reset: zera totalPoints. Abre novo ciclo. Envia FCM de resumo.
sendTaskReminders	Scheduler a cada 15 min	Consulta tarefas com dueTime nos próximos 15 min e envia FCM push para os membros atribuídos.
Tipos de Notificação FCM
Evento	Destinatário	Mensagem
Tarefa próxima do vencimento	Membro	"⏰ [Tarefa] vence às [hora]"
Tarefa perdida	Membro	"❌ [Tarefa] não foi feita. −[N] pontos"
Tarefa submetida (para aprovação)	Admin	"📋 [Nome] concluiu [Tarefa] — aguarda aprovação"
Tarefa aprovada	Membro	"✅ [Tarefa] aprovada! +[N] pontos"
Tarefa rejeitada	Membro	"❌ [Tarefa] foi rejeitada: [motivo]"
Resgate aprovado	Membro	"🎁 Você resgatou [Prêmio]!"
Encerramento de ciclo	Todos	"📊 Resumo de [mês] disponível!"
Padrões de Código
Transação de resgate (SEMPRE usar runTransaction)
export const redeemPrize = async (familyId: string, userId: string, prizeId: string) => {
  return runTransaction(db, async (transaction) => {
    const memberRef = doc(db, 'families', familyId, 'members', userId);
    const prizeRef  = doc(db, 'families', familyId, 'prizes', prizeId);
    const member = (await transaction.get(memberRef)).data()!;
    const prize  = (await transaction.get(prizeRef)).data()!;

    if (member.totalPoints < prize.pointsCost) throw new Error('Pontos insuficientes');
    if (!prize.isAvailable) throw new Error('Prêmio indisponível');
    if (prize.quantity !== null && prize.quantityRedeemed >= prize.quantity)
      throw new Error('Prêmio esgotado');

    transaction.update(memberRef, { totalPoints: member.totalPoints - prize.pointsCost });
    transaction.update(prizeRef,  { quantityRedeemed: prize.quantityRedeemed + 1 });
    const redemptionRef = doc(collection(db, 'families', familyId, 'redemptions'));
    transaction.set(redemptionRef, {
      prizeId, prizeTitle: prize.title, pointsCost: prize.pointsCost,
      userId, userName: member.displayName, familyId,
      status: 'approved', redeemedAt: serverTimestamp(),
      cycleId: getCurrentCycleId(),
    });
  });
};

Hook padrão com real-time listener
export const useTasks = (familyId: string) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'families', familyId, 'tasks'),
      where('isActive', '==', true),
      orderBy('order')
    );
    return onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      setLoading(false);
    });
  }, [familyId]);

  return { tasks, loading };
};

Paleta de Cores
Primary:  #6366F1  (indigo)  — ações principais
Success:  #22C55E  (green)   — tarefas concluídas, pontos ganhos
Warning:  #F59E0B  (amber)   — tarefas pendentes
Danger:   #EF4444  (red)     — pontos perdidos, tarefas faltadas
Gold:     #EAB308  (yellow)  — pontos, estrelas, ranking

Fases de Desenvolvimento
Fase 1 — Fundação e autenticação (semanas 1-2)
 Setup React + Vite + Tailwind + TypeScript
 Configurar Firebase (Auth, Firestore, Storage, Hosting)
 vite-plugin-pwa com manifest
 Telas: Login, Register (criar família), JoinFamily (código convite)
 Zustand stores: authStore, familyStore
 AppLayout com BottomNav
 RoleRoute para proteção de rotas
 Deploy inicial no Firebase Hosting
Fase 2 — Tarefas e pontuação (semanas 3-4)
 CRUD completo de tarefas (admin) com todos os padrões de recorrência
 Preview de próximas datas ao criar tarefa (usa recurrence.ts)
 generateDailyCompletions Cloud Function (ID determinístico, idempotente)
 Listagem de tarefas do dia (member) — real-time listener
 CompletionButton: sem aprovação (completed imediato) e com aprovação (submitted)
 Upload de foto-prova para Firebase Storage (storage.service.ts)
 Security Rules completas
 processMissedTasks Cloud Function
Fase 3 — Aprovação e missed tasks (semanas 5-6)
 ApprovalsPage admin: lista completions submitted com foto-prova
 onCompletionApproved Cloud Function: crédito de pontos + streak + FCM
 Settings da família: toggles requireTaskApproval e requirePhotoProof
 Feedback visual na tela do membro (status da aprovação em tempo real)
Fase 4 — Prêmios e resgates (semanas 7-8)
 CRUD de prêmios (admin) com pointsCost individual por prêmio
 PrizeGrid: affordability indicator (verde se totalPoints >= pointsCost)
 RedeemModal com confirmação + transação automática
 Histórico de resgates
Fase 5 — Dashboard e performance (semanas 9-10)
 DashboardPage admin: StatsCards + CompletionChart (Recharts)
 PerformancePage member: pontos + streak + gráfico + ranking comparativo familiar
 PointsPage: saldo + histórico + gráfico mensal
 closeMonthCycle Cloud Function (modo monthly_reset)
Fase 6 — Notificações e polimento (semanas 11-12)
 firebase-messaging-sw.js + permissão FCM no onboarding
 PushPermissionBanner para iOS
 sendTaskReminders Cloud Function (a cada 15 min)
 Animações: confetti no resgate, pulse no ganho de ponto
 Testes com família real
 Offline support (Firestore cache)
 Domínio customizado no Firebase Hosting
Contexto de Continuação
Repositório: não criado — iniciar com npm create vite@latest familyquest -- --template react-ts
Firebase Project: não criado — criar em console.firebase.google.com
Status atual: Planejamento concluído. Próximo passo: Fase 1.

A cada nova sessão:

Leia este CLAUDE.md
Confirme a fase atual e feature em desenvolvimento
Mantenha a estrutura de arquivos definida acima
Nunca altere o modelo de dados sem revisar Security Rules e Cloud Functions impactadas