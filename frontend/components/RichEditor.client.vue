<script setup lang="ts">
// Éditeur de texte riche (Tiptap). Rendu côté navigateur uniquement. Le HTML produit est re-nettoyé par le serveur à l'enregistrement.
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import type { PickedMedia } from './MediaPicker.vue';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const showPicker = ref(false);

const editor = useEditor({
  content: props.modelValue,
  extensions: [StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false } }), Image],
  editorProps: { attributes: { class: 'rich min-h-[260px] px-4 py-3 focus:outline-none' } },
  onUpdate: ({ editor }) => emit('update:modelValue', editor.getHTML()),
});

// Mise à jour externe (chargement d'un contenu) sans boucle.
watch(
  () => props.modelValue,
  (v) => {
    if (editor.value && v !== editor.value.getHTML()) editor.value.commands.setContent(v, { emitUpdate: false });
  },
);

function setLink() {
  const ed = editor.value;
  if (!ed) return;
  const previous = ed.getAttributes('link').href as string | undefined;
  const href = window.prompt('Adresse du lien (https://…) — laisser vide pour retirer :', previous ?? 'https://');
  if (href === null) return;
  if (href.trim() === '' || href.trim() === 'https://') ed.chain().focus().extendMarkRange('link').unsetLink().run();
  else ed.chain().focus().extendMarkRange('link').setLink({ href: href.trim() }).run();
}

function insertImage(m: PickedMedia) {
  editor.value?.chain().focus().setImage({ src: m.url, alt: m.alt || m.filename }).run();
  showPicker.value = false;
}

const btn = (active: boolean) =>
  ['rounded px-2 py-1 text-sm hover:bg-slate-200', active ? 'bg-slate-200 font-semibold' : ''];
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-slate-300 bg-white">
    <div v-if="editor" class="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-1.5" role="toolbar" aria-label="Mise en forme">
      <button type="button" :class="btn(editor.isActive('bold'))" title="Gras" @click="editor.chain().focus().toggleBold().run()"><b>G</b></button>
      <button type="button" :class="btn(editor.isActive('italic'))" title="Italique" @click="editor.chain().focus().toggleItalic().run()"><i>I</i></button>
      <button type="button" :class="btn(editor.isActive('underline'))" title="Souligné" @click="editor.chain().focus().toggleUnderline().run()"><u>S</u></button>
      <span class="mx-1 w-px bg-slate-300" />
      <button type="button" :class="btn(editor.isActive('heading', { level: 2 }))" title="Titre" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">Titre</button>
      <button type="button" :class="btn(editor.isActive('heading', { level: 3 }))" title="Sous-titre" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()">Sous-titre</button>
      <span class="mx-1 w-px bg-slate-300" />
      <button type="button" :class="btn(editor.isActive('bulletList'))" title="Liste à puces" @click="editor.chain().focus().toggleBulletList().run()">• Liste</button>
      <button type="button" :class="btn(editor.isActive('orderedList'))" title="Liste numérotée" @click="editor.chain().focus().toggleOrderedList().run()">1. Liste</button>
      <button type="button" :class="btn(editor.isActive('blockquote'))" title="Citation" @click="editor.chain().focus().toggleBlockquote().run()">« »</button>
      <span class="mx-1 w-px bg-slate-300" />
      <button type="button" :class="btn(editor.isActive('link'))" title="Lien" @click="setLink">Lien</button>
      <button type="button" :class="btn(false)" title="Insérer une image de la médiathèque" @click="showPicker = true">Image</button>
      <span class="mx-1 w-px bg-slate-300" />
      <button type="button" :class="btn(false)" title="Annuler" @click="editor.chain().focus().undo().run()">↶</button>
      <button type="button" :class="btn(false)" title="Rétablir" @click="editor.chain().focus().redo().run()">↷</button>
    </div>
    <EditorContent :editor="editor" />
    <MediaPicker v-if="showPicker" type="image" @select="insertImage" @close="showPicker = false" />
  </div>
</template>
