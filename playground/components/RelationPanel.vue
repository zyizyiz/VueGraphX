<template>
  <section v-if="activeMode === 'geometry'" class="border-t border-slate-100 bg-white px-4 py-4 space-y-3">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs font-semibold text-slate-600 uppercase tracking-wider">Relations</p>
        <p class="mt-1 text-[11px] leading-5 text-slate-400">为 point / line / segment 建立可解释关系；当前会随拖拽实时校验，并为平行/垂直/等长/距离断言提供接近时吸附辅助。</p>
      </div>
      <span class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">
        {{ relations.length }} 条
      </span>
    </div>

    <div v-if="targets.length === 0" class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-[11px] leading-5 text-slate-500">
      当前还没有可用 target。先在几何区创建点 / 线 / 线段命令，例如 <code>A=(0,0)</code>、<code>Segment(A,B)</code>。
    </div>

    <div v-else class="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div class="grid grid-cols-1 gap-2">
        <label class="text-[11px] font-semibold text-slate-500">目标 A</label>
        <select v-model="primaryTargetKey" class="panel-select">
          <option value="">请选择</option>
          <option v-for="target in availablePrimaryTargets" :key="`a-${target.key}`" :value="target.key">
            {{ target.label }} · {{ familyLabel(target.family) }}
          </option>
        </select>
      </div>

      <div class="space-y-2">
        <label class="text-[11px] font-semibold text-slate-500">关系类型</label>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="option in relationKindOptions"
            :key="option.kind"
            type="button"
            class="mini-chip"
            :class="selectedKind === option.kind ? 'mini-chip-active' : ''"
            :disabled="!option.enabled"
            @click="option.enabled && (selectedKind = option.kind)"
          >
            {{ kindLabelMap[option.kind] }}
          </button>
        </div>
        <p class="text-[11px] leading-5 text-slate-500">
          {{ relationHint }}
        </p>
      </div>

      <div v-if="selectedKind === 'parallel'" class="grid grid-cols-2 gap-2">
        <div class="space-y-2">
          <label class="text-[11px] font-semibold text-slate-500">平行吸附进入阈值 (°)</label>
          <input v-model.number="parallelSnapEnterAngle" type="number" min="0" step="0.1" class="panel-input" />
        </div>
        <div class="space-y-2">
          <label class="text-[11px] font-semibold text-slate-500">平行吸附退出阈值 (°)</label>
          <input v-model.number="parallelSnapExitAngle" type="number" min="0" step="0.1" class="panel-input" />
        </div>
      </div>

      <div v-else-if="selectedKind === 'perpendicular'" class="grid grid-cols-2 gap-2">
        <div class="space-y-2">
          <label class="text-[11px] font-semibold text-slate-500">垂直吸附进入阈值 (°)</label>
          <input v-model.number="perpendicularSnapEnterAngle" type="number" min="0" step="0.1" class="panel-input" />
        </div>
        <div class="space-y-2">
          <label class="text-[11px] font-semibold text-slate-500">垂直吸附退出阈值 (°)</label>
          <input v-model.number="perpendicularSnapExitAngle" type="number" min="0" step="0.1" class="panel-input" />
        </div>
      </div>

      <div v-else-if="selectedKind === 'equal-length'" class="grid grid-cols-2 gap-2">
        <div class="space-y-2">
          <label class="text-[11px] font-semibold text-slate-500">等长吸附进入差值</label>
          <input v-model.number="equalLengthSnapEnterDelta" type="number" min="0" step="0.05" class="panel-input" />
        </div>
        <div class="space-y-2">
          <label class="text-[11px] font-semibold text-slate-500">等长吸附退出差值</label>
          <input v-model.number="equalLengthSnapExitDelta" type="number" min="0" step="0.05" class="panel-input" />
        </div>
      </div>

      <div v-else-if="selectedKind === 'distance-assertion'" class="grid grid-cols-2 gap-2">
        <div class="space-y-2">
          <label class="text-[11px] font-semibold text-slate-500">距离吸附进入差值</label>
          <input v-model.number="distanceAssertionSnapEnterDelta" type="number" min="0" step="0.05" class="panel-input" />
        </div>
        <div class="space-y-2">
          <label class="text-[11px] font-semibold text-slate-500">距离吸附退出差值</label>
          <input v-model.number="distanceAssertionSnapExitDelta" type="number" min="0" step="0.05" class="panel-input" />
        </div>
      </div>

      <div class="grid grid-cols-1 gap-2">
        <label class="text-[11px] font-semibold text-slate-500">目标 B <span class="font-normal text-slate-400">({{ availableSecondaryTargets.length }} 个兼容 target)</span></label>
        <select v-model="secondaryTargetKey" class="panel-select">
          <option value="">请选择</option>
          <option v-for="target in availableSecondaryTargets" :key="`b-${target.key}`" :value="target.key">
            {{ target.label }} · {{ familyLabel(target.family) }}
          </option>
        </select>
      </div>

      <div v-if="selectedKind === 'distance-assertion'" class="grid grid-cols-1 gap-2">
        <label class="text-[11px] font-semibold text-slate-500">目标距离</label>
        <input v-model.number="expectedDistance" type="number" step="0.1" class="panel-input" />
      </div>

      <div class="flex items-center justify-between gap-3">
        <p class="text-[11px] text-slate-500">
          {{ lastMessage || '支持平行 / 垂直 / 等长 / 距离断言。' }}
        </p>
        <div class="flex items-center gap-2">
          <button
            v-if="selectedKind === 'parallel' || selectedKind === 'perpendicular' || selectedKind === 'equal-length' || selectedKind === 'distance-assertion'"
            type="button"
            class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-sky-300 hover:text-sky-600"
            @click="applyRelationAssistOptions()"
          >
            应用阈值
          </button>
          <button type="button" class="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300" :disabled="!canCreate" @click="createRelation()">
            创建关系
          </button>
        </div>
      </div>
    </div>

    <div v-if="relations.length > 0" class="space-y-2">
      <div
        v-for="relation in relations"
        :key="relation.id"
        class="rounded-xl border px-3 py-3"
        :class="statusPanelClass(relation.status)"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs font-semibold text-slate-700">{{ relation.targetLabels.join(' ↔ ') }}</span>
              <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="statusBadgeClass(relation.status)">
                {{ relation.status }}
              </span>
              <span v-if="!relation.active" class="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">inactive</span>
            </div>
            <p class="mt-1 text-[11px] font-medium text-slate-500">{{ kindLabelMap[relation.kind] }}</p>
            <p class="mt-1 text-[11px] leading-5 text-slate-600">{{ relation.explanation }}</p>
            <p v-if="relation.measurements?.[0]" class="mt-1 text-[11px] text-slate-500">
              {{ measurementText(relation) }}
            </p>
            <ul v-if="relation.diagnostics.length > 0" class="mt-2 space-y-1">
              <li v-for="diagnostic in relation.diagnostics" :key="`${relation.id}-${diagnostic.code}`" class="text-[11px] text-rose-600">
                {{ diagnostic.code }} · {{ diagnostic.message }}
              </li>
            </ul>
          </div>

          <div class="flex shrink-0 items-center gap-1.5">
            <button type="button" class="mini-btn" @click="toggleRelation(relation)">
              {{ relation.active ? '停用' : '启用' }}
            </button>
            <button type="button" class="mini-btn mini-btn-danger" @click="removeRelation(relation.id)">
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRelations } from '../composables/useRelations';
import type { PlaygroundMode } from '../types/mode';
import type { GraphRelationSnapshot, GraphRelationTargetDescriptor, GraphXEngine } from 'vuegraphx';

const props = defineProps<{
  engine: GraphXEngine | null;
  activeMode: PlaygroundMode;
}>();

const {
  relations,
  targets,
  availablePrimaryTargets,
  availableSecondaryTargets,
  relationKindOptions,
  selectedKind,
  primaryTargetKey,
  secondaryTargetKey,
  expectedDistance,
  parallelSnapEnterAngle,
  parallelSnapExitAngle,
  perpendicularSnapEnterAngle,
  perpendicularSnapExitAngle,
  equalLengthSnapEnterDelta,
  equalLengthSnapExitDelta,
  distanceAssertionSnapEnterDelta,
  distanceAssertionSnapExitDelta,
  canCreate,
  lastMessage,
  kindLabelMap,
  createRelation,
  removeRelation,
  toggleRelation,
  applyRelationAssistOptions
} = useRelations({
  getEngine: () => props.engine,
  getActiveMode: () => props.activeMode
});

const familyLabel = (family: GraphRelationTargetDescriptor['family']) => {
  switch (family) {
    case 'point':
      return '点';
    case 'line-like':
      return '直线';
    case 'segment-like':
      return '线段';
    case 'circle-like':
      return '圆';
    default:
      return family;
  }
};

const statusBadgeClass = (status: GraphRelationSnapshot['status']) => {
  switch (status) {
    case 'satisfied':
      return 'bg-emerald-100 text-emerald-700';
    case 'violated':
      return 'bg-amber-100 text-amber-700';
    case 'conflicting':
      return 'bg-rose-100 text-rose-700';
    case 'missing-target':
      return 'bg-slate-200 text-slate-600';
    case 'unsupported':
    default:
      return 'bg-violet-100 text-violet-700';
  }
};

const statusPanelClass = (status: GraphRelationSnapshot['status']) => {
  switch (status) {
    case 'satisfied':
      return 'border-emerald-200 bg-emerald-50/40';
    case 'violated':
      return 'border-amber-200 bg-amber-50/50';
    case 'conflicting':
      return 'border-rose-200 bg-rose-50/50';
    case 'missing-target':
      return 'border-slate-200 bg-slate-50';
    case 'unsupported':
    default:
      return 'border-violet-200 bg-violet-50/50';
  }
};

const measurementText = (relation: GraphRelationSnapshot) => {
  const measurement = relation.measurements?.[0];
  if (!measurement) return '';

  if (measurement.kind === 'angle') {
    return `当前夹角：${measurement.actualValue}°`;
  }

  if (measurement.expectedValue !== undefined) {
    return `当前值：${measurement.actualValue} / 目标值：${measurement.expectedValue} / 差值：${measurement.delta ?? 0}`;
  }

  return `当前值：${measurement.actualValue}`;
};

const relationHint = computed(() => {
  switch (selectedKind.value) {
    case 'parallel':
      return '需要两条 line-like / segment-like 目标，检查它们是否保持平行；当接近目标角度时会按当前阈值提供吸附辅助。';
    case 'perpendicular':
      return '需要两条 line-like / segment-like 目标，检查是否维持 90°；当接近垂直时会按当前阈值提供吸附辅助。';
    case 'equal-length':
      return '需要两条线段目标，比较当前长度差；当接近等长时会按当前阈值提供吸附辅助。';
    case 'distance-assertion':
      return '需要两个点目标，判断当前距离是否满足目标值；当接近目标距离时会按当前阈值提供吸附辅助。';
    default:
      return '';
  }
});
</script>

<style scoped>
.panel-select,
.panel-input {
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid #cbd5e1;
  background: white;
  padding: 0.55rem 0.75rem;
  font-size: 12px;
  color: #334155;
  outline: none;
}

.panel-select:focus,
.panel-input:focus {
  border-color: #38bdf8;
}

.mini-chip {
  border-radius: 999px;
  border: 1px solid #cbd5e1;
  background: white;
  padding: 0.35rem 0.6rem;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
}

.mini-chip:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.mini-chip-active {
  border-color: #7dd3fc;
  background: #e0f2fe;
  color: #0369a1;
}

.mini-btn {
  border-radius: 0.55rem;
  border: 1px solid #cbd5e1;
  background: white;
  padding: 0.35rem 0.6rem;
  font-size: 11px;
  font-weight: 600;
  color: #475569;
}

.mini-btn-danger {
  border-color: #fecaca;
  color: #dc2626;
}
</style>
