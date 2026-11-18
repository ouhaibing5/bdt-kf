<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import { useKnowledgeStore } from '@/stores/knowledge'
import type { KnowledgeItem } from '@/types/knowledge'

const store = useKnowledgeStore()

const keyword = ref('')
const categoryId = ref<string | 'all'>('all')
const selectedTags = ref<string[]>([])

const tableData = computed(() =>
  store.filterItems({
    keyword: keyword.value,
    categoryId: categoryId.value,
    tags: selectedTags.value,
  }),
)

const categoryCount = computed(() => {
  const map: Record<string, number> = { all: store.items.length }
  for (const c of store.categories) map[c.id] = 0
  for (const item of store.items) {
    map[item.categoryId] = (map[item.categoryId] || 0) + 1
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
  keywords: [] as string[],
  enabled: true,
  tagInput: '',
  keywordInput: '',
})

function openCreate() {
  editingId.value = null
  form.categoryId = store.sortedCategories[0]?.id || ''
  form.title = ''
  form.content = ''
  form.tags = []
  form.keywords = []
  form.enabled = true
  form.tagInput = ''
  form.keywordInput = ''
  dialogVisible.value = true
}

function openEdit(row: KnowledgeItem) {
  editingId.value = row.id
  form.categoryId = row.categoryId
  form.title = row.title
  form.content = row.content
  form.tags = [...row.tags]
  form.keywords = [...row.keywords]
  form.enabled = row.enabled
  form.tagInput = ''
  form.keywordInput = ''
  dialogVisible.value = true
}

function addFormTag() {
  const t = form.tagInput.trim()
  if (!t) return
  if (!form.tags.includes(t)) form.tags.push(t)
  form.tagInput = ''
}

function addFormKeyword() {
  const t = form.keywordInput.trim()
  if (!t) return
  if (!form.keywords.includes(t)) form.keywords.push(t)
  form.keywordInput = ''
}

function submitForm() {
  const saved = store.saveItem({
    id: editingId.value || undefined,
    categoryId: form.categoryId,
    title: form.title,
    content: form.content,
    tags: form.tags,
    keywords: form.keywords,
    enabled: form.enabled,
  })
  if (!saved) {
    ElMessage.warning('请填写标题和内容')
    return
  }
  ElMessage.success(editingId.value ? '知识已更新' : '知识已新增')
  dialogVisible.value = false
}

async function onDelete(row: KnowledgeItem) {
  await ElMessageBox.confirm(`确认删除「${row.title}」？`, '删除确认', {
    type: 'warning',
  })
  store.removeItem(row.id)
  ElMessage.success('已删除')
}

const catDialog = ref(false)
const catName = ref('')

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
  await ElMessageBox.confirm(`确认删除分类「${name}」？`, '删除分类', {
    type: 'warning',
  })
  const ok = store.removeCategory(id)
  if (!ok) {
    ElMessage.error('该分类下仍有知识条目，无法删除')
    return
  }
  if (categoryId.value === id) categoryId.value = 'all'
  ElMessage.success('分类已删除')
}
</script>

<template>
  <div class="kb-page">
    <aside class="kb-aside">
      <div class="aside-head">
        <h3>知识分类</h3>
        <el-button
          link
          type="primary"
          @click="
            () => {
              catName = ''
              catDialog = true
            }
          "
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
      <div v-for="cat in store.sortedCategories" :key="cat.id" class="cat-row">
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

    <section class="kb-main">
      <div class="page-title">
        <div>
          <h2>知识库管理</h2>
          <p>
            跨境物流知识供 AI 接管检索调用；与快捷回复联动，自动匹配轨迹/清关/FBA/费用等意图
          </p>
        </div>
        <el-button type="primary" :icon="Plus" @click="openCreate"
          >新建知识</el-button
        >
      </div>

      <div class="filters">
        <el-input
          v-model="keyword"
          clearable
          :prefix-icon="Search"
          placeholder="搜索标题 / 内容 / 关键词"
          style="width: 280px"
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
            >清空</el-button
          >
        </div>
      </div>

      <el-table :data="tableData" stripe height="100%" class="kb-table">
        <el-table-column prop="title" label="标题" min-width="160" />
        <el-table-column label="分类" width="120">
          <template #default="{ row }">
            {{ store.categoryName(row.categoryId) }}
          </template>
        </el-table-column>
        <el-table-column label="标签" min-width="140">
          <template #default="{ row }">
            <el-tag
              v-for="tag in row.tags"
              :key="tag"
              size="small"
              effect="plain"
              type="primary"
              class="chip"
              >{{ tag }}</el-tag
            >
          </template>
        </el-table-column>
        <el-table-column label="检索词" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.keywords.join('、') }}
          </template>
        </el-table-column>
        <el-table-column
          prop="content"
          label="内容摘要"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column prop="useCount" label="AI调用" width="90" sortable />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-switch
              :model-value="row.enabled"
              @change="store.toggleItem(row.id)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="openEdit(row as KnowledgeItem)"
              >编辑</el-button
            >
            <el-button
              link
              type="danger"
              @click="onDelete(row as KnowledgeItem)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑知识' : '新建知识'"
      width="640px"
      destroy-on-close
    >
      <el-form label-width="88px">
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
          <el-input v-model="form.title" maxlength="60" show-word-limit />
        </el-form-item>
        <el-form-item label="正文" required>
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="6"
            placeholder="供客服查阅，并作为 AI 接管时的知识引用内容"
          />
        </el-form-item>
        <el-form-item label="标签">
          <div class="form-tags">
            <el-tag
              v-for="tag in form.tags"
              :key="tag"
              closable
              @close="form.tags = form.tags.filter((t) => t !== tag)"
              >{{ tag }}</el-tag
            >
            <el-input
              v-model="form.tagInput"
              size="small"
              placeholder="回车添加"
              style="width: 120px"
              @keyup.enter="addFormTag"
            />
          </div>
        </el-form-item>
        <el-form-item label="检索关键词">
          <div class="form-tags">
            <el-tag
              v-for="kw in form.keywords"
              :key="kw"
              type="success"
              closable
              @close="form.keywords = form.keywords.filter((t) => t !== kw)"
              >{{ kw }}</el-tag
            >
            <el-input
              v-model="form.keywordInput"
              size="small"
              placeholder="同义词/场景词"
              style="width: 140px"
              @keyup.enter="addFormKeyword"
            />
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
      <el-input v-model="catName" placeholder="分类名称" maxlength="20" />
      <template #footer>
        <el-button @click="catDialog = false">取消</el-button>
        <el-button type="primary" @click="submitCategory">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.kb-page {
  height: 100%;
  display: flex;
  gap: 12px;
  padding: 12px;
  box-sizing: border-box;
  min-height: 0;
}

.kb-aside {
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
}

.cat-item {
  flex: 1;
  display: flex;
  justify-content: space-between;
  border: none;
  background: transparent;
  padding: 10px;
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

.kb-main {
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

  .label {
    flex-shrink: 0;
    font-size: 13px;
    color: $text-secondary;
  }

  :deep(.el-check-tag) {
    flex-shrink: 0;
  }
}

.kb-table {
  flex: 1;
  min-height: 0;
}

.chip {
  margin-right: 4px;
}

.form-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
</style>
