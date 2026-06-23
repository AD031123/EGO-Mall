<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { marked } from 'marked'
import { useToast } from '@/composables/useToast.js'

marked.use({ gfm: true })

const route = useRoute()
const toast = useToast()

const productId = ref('')
const productName = ref('')
const markdown = ref('')
const previewHtml = ref('')
const fileInput = ref(null)
const saving = ref(false)

// 从 localStorage 获取管理员 token
function getToken() {
  return localStorage.getItem('ego_admin_token') || ''
}

onMounted(() => {
  const pid = route.query.pid || ''
  const name = route.query.name || ''
  const desc = route.query.desc || ''
  productId.value = pid
  productName.value = name
  markdown.value = desc
  updatePreview()
  document.title = `编辑描述 - ${name}`
})

function updatePreview() {
  try { previewHtml.value = marked.parse(markdown.value || '') } catch { previewHtml.value = '' }
}

function insertMd(prefix, suffix) {
  const ta = document.getElementById('editor-area')
  if (!ta) return
  const start = ta.selectionStart; const end = ta.selectionEnd
  const selected = markdown.value.substring(start, end)
  const text = prefix + selected + suffix
  markdown.value = markdown.value.substring(0, start) + text + markdown.value.substring(end)
  updatePreview()
  setTimeout(() => { ta.focus(); ta.setSelectionRange(start + prefix.length, start + prefix.length + selected.length) }, 50)
}
function insertBold() { insertMd('**', '**') }
function insertItalic() { insertMd('*', '*') }
function insertHeading() { insertMd('#### ', '') }
function insertCode() { insertMd('\n```\n', '\n```\n') }
function insertLink() { insertMd('[链接文字](', ')') }
function insertHr() { insertMd('\n---\n', '') }

function onPickImage() { fileInput.value?.click() }

async function onImageFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) { toast.warn('图片不能超过 5MB'); e.target.value = ''; return }
  const reader = new FileReader()
  reader.onload = async (ev) => {
    const dataUrl = ev.target.result
    try {
      const pid = productId.value
      const token = getToken()
      const res = await fetch('/api/products/upload-desc-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ product_id: pid || '', image: dataUrl })
      })
      const r = await res.json()
      if (r.code === 0) {
        const ta = document.getElementById('editor-area')
        const pos = ta ? ta.selectionStart : markdown.value.length
        markdown.value = markdown.value.substring(0, pos) + `\n![](${r.data.path})\n` + markdown.value.substring(pos)
        updatePreview()
        toast.success('图片已插入')
      } else { toast.error(r.message || '上传失败') }
    } catch { toast.error('上传图片失败') }
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

async function onSave() {
  if (!productId.value) {
    // 新建模式下，通过 postMessage 回传
    if (window.opener) {
      window.opener.postMessage({ type: 'md-save', content: markdown.value }, window.location.origin)
      toast.success('已保存')
    }
    return
  }
  saving.value = true
  try {
    const token = getToken()
    const res = await fetch(`/api/products/${productId.value}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ description: markdown.value })
    })
    const r = await res.json()
    if (r.code === 0) {
      if (window.opener) {
        window.opener.postMessage({ type: 'md-save', content: markdown.value }, window.location.origin)
      }
      toast.success('已保存')
    } else { toast.error(r.message || '保存失败') }
  } catch { toast.error('保存失败') }
  finally { saving.value = false }
}

function onCancel() { window.close() }
</script>

<template>
  <div class="editor-page">
    <div class="editor-header">
      <h5 class="mb-0 fw-bold">📝 编辑商品描述 — {{ productName }}</h5>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-secondary rounded-pill px-4" @click="onCancel">取消</button>
        <button class="btn btn-sm btn-primary rounded-pill px-4" :disabled="saving" @click="onSave">{{ saving ? '保存中...' : '保存' }}</button>
      </div>
    </div>

    <div class="editor-toolbar">
      <button class="btn btn-sm btn-light border" @click="insertBold"><b>B</b></button>
      <button class="btn btn-sm btn-light border" @click="insertItalic"><i>I</i></button>
      <button class="btn btn-sm btn-light border" @click="insertHeading">H4</button>
      <button class="btn btn-sm btn-light border" @click="insertCode">&lt;/&gt;</button>
      <button class="btn btn-sm btn-light border" @click="insertLink">🔗</button>
      <button class="btn btn-sm btn-light border" @click="insertHr">—</button>
      <span class="mx-1 text-muted">|</span>
      <button class="btn btn-sm btn-outline-primary" @click="onPickImage">🖼️ 插入图片</button>
      <input ref="fileInput" type="file" accept="image/*" hidden @change="onImageFileChange" />
    </div>

    <div class="editor-body">
      <div class="editor-left">
        <textarea
          id="editor-area"
          v-model="markdown"
          class="editor-textarea"
          spellcheck="false"
          placeholder="在此输入 Markdown 内容..."
          @input="updatePreview"
        ></textarea>
      </div>
      <div class="editor-right">
        <div class="preview-header">实时预览</div>
        <div class="preview-wrap">
          <div v-html="previewHtml" class="md-preview"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; overflow: hidden; background: #fff; }
#app { height: 100%; }
.editor-page {
  display: flex; flex-direction: column; height: 100vh;
  background: #fff;
}
.editor-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 20px; border-bottom: 1px solid #eee;
  flex-shrink: 0; background: #fff;
}
.editor-toolbar {
  display: flex; align-items: center; gap: 4px;
  padding: 8px 20px; border-bottom: 1px solid #eee;
  background: #fafafa; flex-shrink: 0;
}
.editor-body {
  display: flex; flex: 1; overflow: hidden; min-height: 0;
}
.editor-left {
  width: 50%; display: flex; flex-direction: column; min-width: 0;
  border-right: 1px solid #eee;
}
.editor-right {
  width: 50%; display: flex; flex-direction: column; min-width: 0;
}
.editor-textarea {
  display: block; width: 100%; flex: 1; border: none; outline: none; resize: none;
  padding: 16px; font-family: 'Consolas','Monaco',monospace; font-size: 0.85rem;
  line-height: 1.7; color: #333; background: #fff;
}
.editor-textarea:focus { box-shadow: inset 0 0 0 2px #52CDFF; }
.preview-header {
  padding: 6px 16px; font-size: 0.78rem; color: #888;
  background: #fafafa; border-bottom: 1px solid #eee;
  flex-shrink: 0;
}
.preview-wrap {
  flex: 1; padding: 16px; overflow-y: auto;
}
.md-preview img { max-width: 100%; height: auto; }
.md-preview h1,.md-preview h2,.md-preview h3 { margin-top: 1em; margin-bottom: 0.5em; }
.md-preview p { margin-bottom: 0.8em; line-height: 1.7; }
.md-preview code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 0.88em; }
.md-preview pre { background: #f5f5f5; padding: 12px 16px; border-radius: 6px; overflow-x: auto; }
.md-preview pre code { background: none; padding: 0; }
.md-preview blockquote { border-left: 3px solid #52CDFF; padding-left: 12px; color: #666; margin: 1em 0; }
.md-preview table { border-collapse: collapse; width: 100%; }
.md-preview th, .md-preview td { border: 1px solid #ddd; padding: 8px; text-align: left; }
.md-preview th { background: #f5f5f5; }
</style>
