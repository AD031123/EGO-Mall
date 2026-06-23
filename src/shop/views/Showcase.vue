<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getShowcase, getAllShowcases } from '@/data/showcase.js'
import { marked } from 'marked'

marked.use({ gfm: true })

const route = useRoute()
const router = useRouter()
const item = ref(null)
const activeImage = ref('')
const notFound = ref(false)

const allShowcases = getAllShowcases()

onMounted(() => {
  const id = route.params.id
  const found = getShowcase(id)
  if (!found) {
    notFound.value = true
    return
  }
  item.value = found
  activeImage.value = found.cover
})

const renderedDesc = computed(() => {
  if (!item.value?.desc) return ''
  return marked.parse(item.value.desc)
})

function goTo(id) {
  router.push(`/showcase/${id}`)
}

function onBannerClick(item) {
  router.push(`/showcase/${item.id}`)
}
</script>

<template>
  <div class="container py-4" style="max-width: 960px; margin: 0 auto;">

    <!-- 404 -->
    <div v-if="notFound" class="text-center py-5">
      <div style="font-size: 5rem;">🔍</div>
      <h3 class="fw-bold mt-3">演示页面不存在</h3>
      <p class="text-muted">请检查轮播图配置中的 showcase id</p>
      <button class="btn btn-primary mt-2" @click="router.push('/')">← 返回首页</button>
    </div>

    <template v-if="item">
      <!-- 面包屑 -->
      <nav class="mb-3" style="font-size:0.82rem; color:#999;">
        <router-link to="/" class="text-decoration-none" style="color:#52CDFF;">首页</router-link>
        <span class="mx-1">/</span>
        <router-link to="/" class="text-decoration-none" style="color:#52CDFF;">演示页面</router-link>
        <span class="mx-1">/</span>
        <span>{{ item.title }}</span>
      </nav>

      <!-- 顶部：封面 + 简介 -->
      <div class="card border-0 shadow-sm mb-4" style="border-radius: 16px; overflow: hidden;">
        <div class="row g-0">
          <!-- 封面大图 -->
          <div class="col-md-5">
            <div
              :style="{
                height: '100%',
                minHeight: '320px',
                background: `url(${item.cover}) center/cover no-repeat`,
                backgroundPosition: 'center'
              }"
            ></div>
          </div>
          <!-- 信息 -->
          <div class="col-md-7">
            <div class="p-4 d-flex flex-column h-100">
              <!-- 标签 -->
              <div class="mb-2">
                <span
                  v-for="tag in item.tags" :key="tag"
                  class="badge me-1 mb-1"
                  style="background:#52CDFF; color:#fff; font-size:0.7rem; font-weight:500;"
                >{{ tag }}</span>
              </div>
              <h3 class="fw-bold mb-2">{{ item.title }}</h3>
              <p class="text-muted mb-3" style="line-height:1.6;">{{ item.subtitle }}</p>
              <p class="mb-4" style="color:#555; line-height:1.7;">{{ item.summary }}</p>
              <!-- 价格 -->
              <div class="mt-auto">
                <span style="font-size:1.8rem; font-weight:700; color:#ff4d4f;">¥{{ Number(item.price).toFixed(2) }}</span>
                <span class="text-muted ms-2" style="font-size:0.85rem;">此为演示价格</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 规格参数 -->
      <div class="card border-0 shadow-sm mb-4" style="border-radius: 16px; overflow: hidden;">
        <div class="card-body p-4">
          <h5 class="fw-bold mb-3">📐 规格参数</h5>
          <table class="table table-borderless mb-0" style="font-size:0.9rem;">
            <tbody>
              <tr v-for="(value, key) in item.spec" :key="key">
                <td class="ps-0" style="width:120px; color:#999;">{{ key }}</td>
                <td style="color:#333; font-weight:500;">{{ value }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 详细描述 (Markdown) -->
      <div class="card border-0 shadow-sm mb-4" style="border-radius: 16px; overflow: hidden;">
        <div class="card-body p-4">
          <h5 class="fw-bold mb-3">📖 详细介绍</h5>
          <div class="markdown-body" v-html="renderedDesc"></div>
        </div>
      </div>

      <!-- 底部：导航到其它演示页 -->
      <div class="card border-0 shadow-sm" style="border-radius: 16px; overflow: hidden;">
        <div class="card-body p-4">
          <h5 class="fw-bold mb-3">🔗 其他演示页面</h5>
          <div class="row g-2">
            <div v-for="s in allShowcases" :key="s.id" class="col-6 col-md-4 col-lg">
              <div
                class="card border-0 h-100"
                :class="{ 'bg-light': s.id === item.id }"
                style="cursor:pointer; border-radius:12px; overflow:hidden; transition: transform 0.2s;"
                @click="goTo(s.id)"
              >
                <div
                  :style="{
                    height: '100px',
                    background: `url(${s.cover}) center/cover no-repeat`
                  }"
                ></div>
                <div class="p-2">
                  <div style="font-size:0.72rem; font-weight:600; color:#333; line-height:1.3;">{{ s.title }}</div>
                  <div style="font-size:0.75rem; color:#ff4d4f; font-weight:700;">¥{{ s.price.toFixed(2) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

  </div>
</template>

<style scoped>
/* Markdown 渲染样式 */
.markdown-body :deep(h2) {
  font-size: 1.3rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: #333;
  border-bottom: 2px solid #52CDFF;
  padding-bottom: 0.3rem;
}
.markdown-body :deep(h3) {
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 1.2rem;
  margin-bottom: 0.5rem;
}
.markdown-body :deep(p) {
  line-height: 1.8;
  color: #444;
  margin-bottom: 0.6rem;
}
.markdown-body :deep(ul), .markdown-body :deep(ol) {
  padding-left: 1.5rem;
  margin-bottom: 0.8rem;
}
.markdown-body :deep(li) {
  line-height: 1.7;
  color: #555;
}
.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}
.markdown-body :deep(th), .markdown-body :deep(td) {
  border: 1px solid #e8e8e8;
  padding: 8px 12px;
  text-align: left;
}
.markdown-body :deep(th) {
  background: #f5f5f5;
  font-weight: 600;
}
.markdown-body :deep(blockquote) {
  border-left: 4px solid #52CDFF;
  padding: 8px 16px;
  margin: 1rem 0;
  background: #f8f9fa;
  color: #666;
  font-style: italic;
}
.markdown-body :deep(strong) {
  color: #333;
}
.markdown-body :deep(hr) {
  margin: 1.5rem 0;
  border: none;
  border-top: 1px solid #eee;
}
</style>
