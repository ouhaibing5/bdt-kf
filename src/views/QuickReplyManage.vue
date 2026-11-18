<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { useQuickReplyStore } from '@/stores/quickReply'
import type { QuickReplyItem } from '@/types/quickReply'

const store = useQuickReplyStore()

const keyword = ref('')
const categoryId = ref<string | 'all'>('all')
const selectedTags = ref<string[]>([])

const tableData = computed(() =>
  store.filterReplies({
    keyword: keyword.value,
    categoryId: categoryId.value,
    tags: selectedTags.value,
  }),
)

const categoryCount = computed(() => {
  const map: Record<string, number> = { all: store.replies.length }
  for (const c of store.categories) map[c.id] = 0
  for (const r of store.replies) {
    map[r.categoryId] = (map[r.categoryId] || 0) + 1
  }
  return map
})

function toggleTag(tag: string) {
  const idx = selectedTags.value.indexOf(tag)
  if (idx >= 0) selectedTags.value.splice(idx, 1)
  else selectedTags.value.push(tag)
}

function clearFilters() {
  keyword.value = ''
  categoryId.value = 'all'
  selectedTags.value = []
}

const dialogVisible = ref(false)
const editingId = ref<string | null>(null)
const form = reactive({
  categoryId: '',
  title: '',
  content: '',
  tags: [] as string[],
  enabled: true,
  tagInput: '',
})

function openCreate() {
  editingId.value = null
  form.categoryId = store.sortedCategories[0]?.id || ''
  form.title = ''
  form.content = ''
  form.tags = []
  form.enabled = true
  form.tagInput = ''
  dialogVisible.value = true
}

function openEdit(row: QuickReplyItem) {
  editingId.value = row.id
  form.categoryId = row.categoryId
  form.title = row.title
  form.content = row.content
  form.tags = [...row.tags]
  form.enabled = row.enabled
  form.tagInput = ''
  dialogVisible.value = true
}

function addFormTag() {
  const t = form.tagInput.trim()
  if (!t) return
  if (!form.tags.includes(t)) form.tags.push(t)
  store.addTag(t)
  form.tagInput = ''
}

function removeFormTag(tag: string) {
  form.tags = form.tags.filter((t) => t !== tag)
}

function submitForm() {
  const saved = store.saveReply({
    id: editingId.value || undefined,
    categoryId: form.categoryId,
    title: form.title,
    content: form.content,
    tags: form.tags,
    enabled: form.enabled,
  })
  if (!saved) {
    ElMessage.warning('请填写标题和内容')
    return
  }
  ElMessage.success(editingId.value ? '已更新快捷回复' : '已新增快捷回复')
  dialogVisible.value = false
}

async function onDelete(row: QuickReplyItem) {
  await ElMessageBox.confirm(`确认删除「${row.title}」？`, '删除确认', {
    type: 'warning',
  })
  store.removeReply(row.id)
  ElMessage.success('已删除')
}

const catDialog = ref(false)
const catName = ref('')

function openCategoryDialog() {
  catName.value = ''
  catDialog.value = true
}

function submitCategory() {
  const row = store.saveCategory({ name: catName.value })
  if (!row) {
    ElMessage.warning('请输入分类名称')
    return
  }
  ElMessage.success('分类已添加')
  catDialog.value = false
}

async function onRemoveCategory(id: string, name: string) {
  await ElMessageBox.confirm(
    `确认删除分类「${name}」？分类下无话术时可删。`,
    '删除分类',
    { type: 'warning' },
  )
  const ok = store.removeCategory(id)
  if (!ok) {
    ElMessage.error('该分类下仍有快捷回复，无法删除')
    return
  }
  if (categoryId.value === id) categoryId.value = 'all'
  ElMessage.success('分类已删除')
}
</script>

<template>
  <div class="qr-page">
    <aside class="qr-aside">
      <div class="aside-head">
        <h3>分类</h3>
        <el-button link type="primary" @click="openCategoryDialog"
          >+ 新增</el-button
        >
      </div>
      <button
        class="cat-item"
        :class="{ active: categoryId === 'all' }"
        @click="categoryId = 'all'"
      >
        <span>全部分类</span>
        <em>{{ categoryCount.all || 0 }}</em>
      </button>
      <div
        v-for="cat in store.sortedCategories"
        :key="cat.id"
        class="cat-row"
      >
        <button
          class="cat-item"
          :class="{ active: categoryId === cat.id }"
          @click="categoryId = cat.id"
        >
          <span>{{ cat.name }}</span>
          <em>{{ categoryCount[cat.id] || 0 }}</em>
        </button>
        <el-button
          link
          type="danger"
          size="small"
          @click="onRemoveCategory(cat.id, cat.name)"
          >删</el-button
        >
      </div>
    </aside>

    <section class="qr-main">
      <div class="page-title">
        <div>
          <h2>快捷回复管理</h2>
          <p>面向跨境物流场景（国际快递 / 专线 / FBA / 清关），按分类与标签管理话术</p>
        </div>
        <el-button type="primary" :icon="Plus" @click="openCreate"
          >新建话术</el-button
        >
      </div>

      <div class="filters">
        <el-input
          v-model="keyword"
          clearable
          :prefix-icon="Search"
          placeholder="搜索标题 / 内容 / 标签"
          style="width: 260px"
        />
        <div class="tag-filter">
          <span class="label">标签：</span>
          <el-check-tag
            v-for="tag in store.allTags"
            :key="tag"
            :checked="selectedTags.includes(tag)"
            @change="toggleTag(tag)"
          >
            {{ tag }}
          </el-check-tag>
          <el-button
            v-if="selectedTags.length || keyword || categoryId !== 'all'"
            link
            type="primary"
            @click="clearFilters"
            >清空筛选</el-button
          >
        </div>
      </div>

      <el-table :data="tableData" stripe height="100%" class="qr-table">
        <el-table-column prop="title" label="标题" min-width="120" />
        <el-table-column label="分类" width="120">
          <template #default="{ row }">
            {{ store.categoryName(row.categoryId) }}
          </template>
        </el-table-column>
        <el-table-column label="标签" min-width="160">
          <template #default="{ row }">
            <el-tag
              v-for="tag in row.tags"
              :key="tag"
              size="small"
              effect="plain"
              type="primary"
              class="tag-chip"
            >
              {{ tag }}
            </el-tag>
            <span v-if="!row.tags.length" class="muted">—</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="content"
          label="内容"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column
          prop="useCount"
          label="使用次数"
          width="100"
          sortable
        />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-switch
              :model-value="row.enabled"
              @change="store.toggleReply(row.id)"
            />
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="170" />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row as QuickReplyItem)"
              >编辑</el-button
            >
            <el-button
              link
              type="danger"
              @click="onDelete(row as QuickReplyItem)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑快捷回复' : '新建快捷回复'"
      width="560px"
      destroy-on-close
    >
      <el-form label-width="80px">
        <el-form-item label="分类" required>
          <el-select v-model="form.categoryId" style="width: 100%">
            <el-option
              v-for="c in store.sortedCategories"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" required>
          <el-input v-model="form.title" maxlength="40" show-word-limit />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="5"
            placeholder="支持变量：{客户名} {订单号} {运单号} {快递公司}"
          />
        </el-form-item>
        <el-form-item label="标签">
          <div class="form-tags">
            <el-tag
              v-for="tag in form.tags"
              :key="tag"
              closable
              @close="removeFormTag(tag)"
              >{{ tag }}</el-tag
            >
            <el-input
              v-model="form.tagInput"
              size="small"
              placeholder="回车添加标签"
              style="width: 140px"
              @keyup.enter="addFormTag"
            />
            <el-select
              placeholder="选用已有标签"
              size="small"
              style="width: 140px"
              @change="
                (v: string) => {
                  if (v && !form.tags.includes(v)) form.tags.push(v)
                }
              "
            >
              <el-option
                v-for="tag in store.allTags"
                :key="tag"
                :label="tag"
                :value="tag"
              />
            </el-select>
          </div>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="catDialog" title="新增分类" width="400px">
      <el-input v-model="catName" placeholder="请输入分类名称" maxlength="20" />
      <template #footer>
        <el-button @click="catDialog = false">取消</el-button>
        <el-button type="primary" @click="submitCategory">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.qr-page {
  height: 100%;
  display: flex;
  gap: 12px;
  padding: 12px;
  box-sizing: border-box;
  min-height: 0;
}

.qr-aside {
  width: 220px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid $border;
  border-radius: 12px;
  padding: 12px;
  overflow: auto;
}

.aside-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;

  h3 {
    margin: 0;
    font-size: 14px;
  }
}

.cat-row {
  display: flex;
  align-items: center;
  gap: 2px;
}

.cat-item {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: none;
  background: transparent;
  padding: 10px 10px;
  border-radius: 8px;
  cursor: pointer;
  color: $text-secondary;
  font-size: 13px;

  em {
    font-style: normal;
    color: $text-muted;
    font-size: 12px;
  }

  &.active {
    background: $primary-bg;
    color: $primary;
    font-weight: 600;

    em {
      color: $primary;
    }
  }
}

.qr-main {
  flex: 1;
  min-width: 0;
  background: #fff;
  border: 1px solid $border;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.page-title {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;

  h2 {
    margin: 0 0 4px;
    font-size: 18px;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: $text-secondary;
  }
}

.filters {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.tag-filter {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
  overflow-x: auto;
  padding-bottom: 2px;

  .label {
    flex-shrink: 0;
    font-size: 13px;
    color: $text-secondary;
  }

  :deep(.el-check-tag) {
    flex-shrink: 0;
  }
}

.qr-table {
  flex: 1;
  min-height: 0;
}

.tag-chip {
  margin-right: 4px;
  margin-bottom: 2px;
}

.muted {
  color: $text-muted;
}

.form-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
</style>
