// src/components/ExerciseForm.tsx
'use client'

import { useState } from 'react'
import {
  APHASIA_TYPES, LEVELS, TASK_TYPES, LOCALES,
  uploadMedia,
  type ExerciseAdmin, type OptionIn, type Locale,
} from '@/lib/backend-api'

const emptyTranslation = (locale: Locale) => ({
  locale, title: '', goal: '', instruction: '', question: '',
})

const emptyOption = (key: string): OptionIn => ({
  option_key: key,
  image_asset: null,
  sort_order: 0,
  translations: LOCALES.map((l) => ({ locale: l, text: '' })),
})

interface Props {
  initial?: ExerciseAdmin
  onSubmit: (data: ExerciseAdmin) => Promise<void>
  submitLabel: string
}

export default function ExerciseForm({ initial, onSubmit, submitLabel }: Props) {
  const [id, setId] = useState(initial?.id || '')
  const [aphasiaType, setAphasiaType] = useState(initial?.aphasia_type || APHASIA_TYPES[0])
  const [level, setLevel] = useState(initial?.level || LEVELS[0])
  const [taskType, setTaskType] = useState(initial?.task_type || TASK_TYPES[0])
  const [order, setOrder] = useState(initial?.order ?? 0)
  const [correctIds, setCorrectIds] = useState((initial?.correct_answer_ids || []).join(','))
  const [imageAsset, setImageAsset] = useState<string | null>(initial?.image_asset || null)
  const [targetLatency, setTargetLatency] = useState(initial?.target_latency_sec ?? 10)
  const [maxLatency, setMaxLatency] = useState(initial?.max_latency_sec ?? 30)
  const [maxHints, setMaxHints] = useState(initial?.max_hints ?? 2)
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? true)
  const [translations, setTranslations] = useState(
    initial?.translations?.length
      ? initial.translations
      : LOCALES.map(emptyTranslation)
  )
  const [options, setOptions] = useState<OptionIn[]>(
    initial?.options?.length ? initial.options : [emptyOption('a'), emptyOption('b')]
  )
  const [saving, setSaving] = useState(false)
  const [uploadingMain, setUploadingMain] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateTranslation(locale: Locale, field: string, value: string) {
    setTranslations((prev) =>
      prev.map((t) => (t.locale === locale ? { ...t, [field]: value } : t))
    )
  }

  function updateOptionTranslation(optIdx: number, locale: Locale, value: string) {
    setOptions((prev) =>
      prev.map((opt, i) =>
        i === optIdx
          ? {
              ...opt,
              translations: opt.translations.map((t) =>
                t.locale === locale ? { ...t, text: value } : t
              ),
            }
          : opt
      )
    )
  }

  function addOption() {
    const nextKey = String.fromCharCode(97 + options.length) // a, b, c, d...
    setOptions((prev) => [...prev, emptyOption(nextKey)])
  }

  function removeOption(idx: number) {
    setOptions((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleMainImageUpload(file: File) {
    setUploadingMain(true)
    try {
      const url = await uploadMedia(file)
      setImageAsset(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Yuklashda xatolik')
    } finally {
      setUploadingMain(false)
    }
  }

  async function handleOptionImageUpload(idx: number, file: File) {
    try {
      const url = await uploadMedia(file)
      setOptions((prev) => prev.map((opt, i) => (i === idx ? { ...opt, image_asset: url } : opt)))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Yuklashda xatolik')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!id.trim()) {
      setError("ID kiritilishi shart (masalan: sem_easy_11)")
      return
    }

    setSaving(true)
    try {
      await onSubmit({
        id,
        aphasia_type: aphasiaType,
        level,
        task_type: taskType,
        order,
        correct_answer_ids: correctIds.split(',').map((s) => s.trim()).filter(Boolean),
        image_asset: imageAsset,
        audio_asset: initial?.audio_asset || null,
        target_latency_sec: targetLatency,
        max_latency_sec: maxLatency,
        max_hints: maxHints,
        is_published: isPublished,
        translations,
        options,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Saqlashda xatolik')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-20">
      {/* Basic fields */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">Asosiy maʼlumotlar</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">ID</label>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              disabled={!!initial}
              placeholder="sem_easy_11"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tartib (order)</label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Afaziya turi</label>
            <select
              value={aphasiaType}
              onChange={(e) => setAphasiaType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {APHASIA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Daraja</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Task turi</label>
            <select
              value={taskType}
              onChange={(e) => setTaskType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {TASK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              To'g'ri javob ID'lari (vergul bilan)
            </label>
            <input
              value={correctIds}
              onChange={(e) => setCorrectIds(e.target.value)}
              placeholder="a,c"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Target latency (sek)</label>
            <input
              type="number"
              value={targetLatency}
              onChange={(e) => setTargetLatency(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Max latency (sek)</label>
            <input
              type="number"
              value={maxLatency}
              onChange={(e) => setMaxLatency(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Max hints</label>
            <input
              type="number"
              value={maxHints}
              onChange={(e) => setMaxHints(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              id="published"
            />
            <label htmlFor="published" className="text-sm text-gray-700">Nashr qilingan</label>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">Asosiy rasm</label>
          {imageAsset && (
            <img src={imageAsset} alt="" className="mb-2 h-32 rounded-lg border border-gray-200 object-contain" />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleMainImageUpload(e.target.files[0])}
            disabled={uploadingMain}
          />
          {uploadingMain && <p className="text-xs text-gray-400">Yuklanmoqda...</p>}
        </div>
      </section>

      {/* Translations */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase text-gray-500">Tarjimalar</h2>
        <div className="space-y-6">
          {translations.map((t) => (
            <div key={t.locale} className="rounded-lg border border-gray-100 p-4">
              <p className="mb-2 text-xs font-semibold uppercase text-indigo-600">{t.locale}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Title</label>
                  <input
                    value={t.title}
                    onChange={(e) => updateTranslation(t.locale, 'title', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Goal</label>
                  <input
                    value={t.goal}
                    onChange={(e) => updateTranslation(t.locale, 'goal', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">Instruction</label>
                  <textarea
                    value={t.instruction}
                    onChange={(e) => updateTranslation(t.locale, 'instruction', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                    rows={2}
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">Question</label>
                  <textarea
                    value={t.question}
                    onChange={(e) => updateTranslation(t.locale, 'question', e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Options */}
      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase text-gray-500">Variantlar (options)</h2>
          <button
            type="button"
            onClick={addOption}
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
          >
            + Variant qo'shish
          </button>
        </div>
        <div className="space-y-4">
          {options.map((opt, idx) => (
            <div key={idx} className="rounded-lg border border-gray-100 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-sm font-semibold text-gray-700">
                  key: {opt.option_key}
                </span>
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  className="text-xs text-red-600 hover:underline"
                >
                  O'chirish
                </button>
              </div>

              {opt.image_asset && (
                <img src={opt.image_asset} alt="" className="mb-2 h-20 rounded-lg border border-gray-200 object-contain" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleOptionImageUpload(idx, e.target.files[0])}
                className="mb-3 text-xs"
              />

              <div className="grid grid-cols-3 gap-2">
                {opt.translations.map((t) => (
                  <div key={t.locale}>
                    <label className="mb-1 block text-xs text-gray-500">{t.locale}</label>
                    <input
                      value={t.text}
                      onChange={(e) => updateOptionTranslation(idx, t.locale, e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white p-4">
        <div className="mx-auto max-w-3xl">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saqlanmoqda...' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}