'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import {
  GripVertical,
  Pencil,
  Trash2,
  Plus,
  Type,
  Hash,
  ListChecks,
  Calendar,
  Mail,
  Phone,
  FileText,
  Database,
  Tag,
  X,
  CircleDot,
  ToggleLeft,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type QuestionType = 'Multiple Choice' | 'Text' | 'Phone' | 'Email' | 'Number' | 'Date'

interface Question {
  id: number
  order: number
  text: string
  type: QuestionType
  required: boolean
  options?: string[]
  category: 'qualification' | 'contact'
}

const initialQuestions: Question[] = [
  {
    id: 1,
    order: 1,
    text: 'What vehicle are you interested in?',
    type: 'Multiple Choice',
    required: true,
    options: ['SUV', 'Sedan', 'Truck', 'EV', 'Other'],
    category: 'qualification',
  },
  {
    id: 2,
    order: 2,
    text: 'What is your budget range?',
    type: 'Multiple Choice',
    required: true,
    options: ['Under $25K', '$25K-$35K', '$35K-$50K', '$50K+'],
    category: 'qualification',
  },
  {
    id: 3,
    order: 3,
    text: 'When are you looking to purchase?',
    type: 'Multiple Choice',
    required: true,
    options: ['Within 30 days', '1-3 months', '3-6 months', 'Just browsing'],
    category: 'qualification',
  },
  {
    id: 4,
    order: 4,
    text: 'Do you have a trade-in?',
    type: 'Multiple Choice',
    required: false,
    options: ['Yes', 'No', 'Maybe'],
    category: 'qualification',
  },
  {
    id: 5,
    order: 5,
    text: 'What is your name?',
    type: 'Text',
    required: true,
    category: 'contact',
  },
  {
    id: 6,
    order: 6,
    text: 'What is the best phone number to reach you?',
    type: 'Phone',
    required: true,
    category: 'contact',
  },
  {
    id: 7,
    order: 7,
    text: 'What is your email address?',
    type: 'Email',
    required: true,
    category: 'contact',
  },
  {
    id: 8,
    order: 8,
    text: 'Preferred contact time?',
    type: 'Multiple Choice',
    required: false,
    options: ['Morning', 'Afternoon', 'Evening', 'Anytime'],
    category: 'contact',
  },
]

const customFields = [
  { name: 'Vehicle Interest', type: 'Multiple Choice', collected: 847, icon: Tag },
  { name: 'Budget Range', type: 'Multiple Choice', collected: 792, icon: Database },
  { name: 'Purchase Timeline', type: 'Multiple Choice', collected: 823, icon: Calendar },
  { name: 'Trade-In Status', type: 'Multiple Choice', collected: 654, icon: ToggleLeft },
  { name: 'Lead Name', type: 'Text', collected: 891, icon: Type },
  { name: 'Phone Number', type: 'Phone', collected: 874, icon: Phone },
  { name: 'Email Address', type: 'Email', collected: 803, icon: Mail },
  { name: 'Contact Preference', type: 'Multiple Choice', collected: 712, icon: CircleDot },
]

const typeConfig: Record<QuestionType, { color: string; icon: typeof Type }> = {
  'Multiple Choice': { color: 'bg-purple-500/15 text-purple-400 border-purple-500/20', icon: ListChecks },
  Text: { color: 'bg-blue-500/15 text-blue-400 border-blue-500/20', icon: Type },
  Phone: { color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: Phone },
  Email: { color: 'bg-amber-500/15 text-amber-400 border-amber-500/20', icon: Mail },
  Number: { color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20', icon: Hash },
  Date: { color: 'bg-rose-500/15 text-rose-400 border-rose-500/20', icon: Calendar },
}

const typeColorMap: Record<QuestionType, string> = {
  'Multiple Choice': 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  Text: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  Phone: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  Email: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  Number: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  Date: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
}

export default function Questions() {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [newQuestionText, setNewQuestionText] = useState('')
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>('Text')
  const [newQuestionRequired, setNewQuestionRequired] = useState(false)
  const [newOptions, setNewOptions] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<{ questions: Question[] }>('/questions')
        if (data.questions && Array.isArray(data.questions)) {
          setQuestions(data.questions)
        }
      } catch (err) {
        console.error('Failed to load questions:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toggleRequired = (id: number) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, required: !q.required } : q))
    )
  }

  const deleteQuestion = async (id: number) => {
    try {
      await api.del(`/questions/${id}`)
    } catch (err) {
      console.error('Failed to delete question:', err)
    }
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const addQuestion = async () => {
    if (!newQuestionText.trim()) return
    const newQ: Question = {
      id: Date.now(),
      order: questions.length + 1,
      text: newQuestionText.trim(),
      type: newQuestionType,
      required: newQuestionRequired,
      options:
        newQuestionType === 'Multiple Choice' && newOptions.trim()
          ? newOptions.split(',').map((o) => o.trim()).filter(Boolean)
          : undefined,
      category: 'qualification',
    }
    try {
      await api.post('/questions', newQ)
    } catch (err) {
      console.error('Failed to create question:', err)
    }
    setQuestions((prev) => [...prev, newQ])
    setNewQuestionText('')
    setNewOptions('')
    setNewQuestionRequired(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Questions & Fields</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            Manage intake questions and data collection for your AI bot
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-[#7C3AED]/15 text-[#7C3AED] border-[#7C3AED]/20 border px-3 py-1">
            {questions.length} questions
          </Badge>
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 border px-3 py-1">
            {customFields.length} fields
          </Badge>
        </div>
      </div>

      {/* Custom Fields Section */}
      <Card className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Database className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Custom Fields</h2>
              <p className="text-sm text-[#9CA3AF]">
                Data fields collected from leads through AI conversations
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {customFields.map((field) => (
              <div
                key={field.name}
                className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
              >
                <div className="rounded-lg bg-white/[0.06] p-2 shrink-0">
                  <field.icon className="h-4 w-4 text-[#9CA3AF]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{field.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge
                      variant="outline"
                      className={`${typeColorMap[field.type as QuestionType] || 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'} border text-[10px] px-1.5 py-0`}
                    >
                      {field.type}
                    </Badge>
                    <span className="text-[11px] text-[#6B7280]">{field.collected} collected</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main content: Questions list + Add form */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Questions List */}
        <div className="lg:col-span-3">
          <Card className="bg-[#141825] border border-white/[0.06] rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[#7C3AED]/10 p-2">
                    <FileText className="h-5 w-5 text-[#7C3AED]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Qualification Questions</h2>
                    <p className="text-sm text-[#9CA3AF]">
                      Questions the AI asks leads during conversations
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {questions.map((question, index) => {
                  const TypeIcon = typeConfig[question.type].icon
                  return (
                    <div
                      key={question.id}
                      className={`group flex items-start gap-3 p-4 rounded-lg border transition-all duration-200 ${
                        editingId === question.id
                          ? 'bg-[#7C3AED]/5 border-[#7C3AED]/20'
                          : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]'
                      }`}
                    >
                      {/* Drag handle */}
                      <div className="mt-1 cursor-grab text-[#4B5563] hover:text-[#9CA3AF] transition-colors shrink-0">
                        <GripVertical className="h-4 w-4" />
                      </div>

                      {/* Order number */}
                      <div className="flex items-center justify-center h-7 w-7 rounded-full bg-white/[0.06] text-xs font-bold text-[#9CA3AF] shrink-0 mt-0.5">
                        {question.order}
                      </div>

                      {/* Question content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-white">{question.text}</p>
                              {question.required && (
                                <span className="text-[#EF4444] text-xs">*</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge
                                variant="outline"
                                className={`${typeConfig[question.type].color} border text-[10px] px-1.5 py-0 gap-1`}
                              >
                                <TypeIcon className="h-2.5 w-2.5" />
                                {question.type}
                              </Badge>
                              {question.required ? (
                                <span className="text-[11px] text-emerald-400 font-medium">Required</span>
                              ) : (
                                <span className="text-[11px] text-[#6B7280]">Optional</span>
                              )}
                            </div>
                            {/* Show options for multiple choice */}
                            {question.options && question.options.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {question.options.map((opt) => (
                                  <span
                                    key={opt}
                                    className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.04] text-[#9CA3AF] border border-white/[0.06]"
                                  >
                                    {opt}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-[#9CA3AF] hover:text-white hover:bg-white/[0.05]"
                          onClick={() => setEditingId(editingId === question.id ? null : question.id)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-[#9CA3AF] hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => deleteQuestion(question.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Add New Question Form */}
        <div className="lg:col-span-2">
          <Card className="bg-[#141825] border border-white/[0.06] rounded-xl hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 sticky top-6">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#7C3AED]/10 p-2">
                  <Plus className="h-5 w-5 text-[#7C3AED]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Add New Question</h2>
                  <p className="text-sm text-[#9CA3AF]">Create a new question for the AI to ask</p>
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-2">
                <Label className="text-sm text-[#9CA3AF]">Question Text</Label>
                <Textarea
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  rows={3}
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-[#6B7280] focus:border-[#7C3AED]/50 focus:ring-[#7C3AED]/20 resize-none"
                  placeholder="e.g. What financing option do you prefer?"
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label className="text-sm text-[#9CA3AF]">Question Type</Label>
                <Select
                  value={newQuestionType}
                  onValueChange={(v) => setNewQuestionType(v as QuestionType)}
                >
                  <SelectTrigger className="w-full bg-white/[0.04] border-white/[0.08] text-white data-[placeholder]:text-[#6B7280] focus:border-[#7C3AED]/50 focus:ring-[#7C3AED]/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1f2e] border-white/[0.08]">
                    <SelectItem value="Multiple Choice" className="text-white focus:bg-white/[0.05] focus:text-white">
                      <span className="flex items-center gap-2">
                        <ListChecks className="h-3.5 w-3.5 text-purple-400" /> Multiple Choice
                      </span>
                    </SelectItem>
                    <SelectItem value="Text" className="text-white focus:bg-white/[0.05] focus:text-white">
                      <span className="flex items-center gap-2">
                        <Type className="h-3.5 w-3.5 text-blue-400" /> Text
                      </span>
                    </SelectItem>
                    <SelectItem value="Number" className="text-white focus:bg-white/[0.05] focus:text-white">
                      <span className="flex items-center gap-2">
                        <Hash className="h-3.5 w-3.5 text-cyan-400" /> Number
                      </span>
                    </SelectItem>
                    <SelectItem value="Phone" className="text-white focus:bg-white/[0.05] focus:text-white">
                      <span className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-emerald-400" /> Phone
                      </span>
                    </SelectItem>
                    <SelectItem value="Email" className="text-white focus:bg-white/[0.05] focus:text-white">
                      <span className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-amber-400" /> Email
                      </span>
                    </SelectItem>
                    <SelectItem value="Date" className="text-white focus:bg-white/[0.05] focus:text-white">
                      <span className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-rose-400" /> Date
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Options for Multiple Choice */}
              {newQuestionType === 'Multiple Choice' && (
                <div className="space-y-2">
                  <Label className="text-sm text-[#9CA3AF]">Options (comma-separated)</Label>
                  <div className="relative">
                    <Input
                      value={newOptions}
                      onChange={(e) => setNewOptions(e.target.value)}
                      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-[#6B7280] focus:border-[#7C3AED]/50 focus:ring-[#7C3AED]/20 pr-8"
                      placeholder="e.g. Option 1, Option 2, Option 3"
                    />
                    {newOptions && (
                      <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white transition-colors"
                        onClick={() => setNewOptions('')}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {newOptions.trim() && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {newOptions
                        .split(',')
                        .map((o) => o.trim())
                        .filter(Boolean)
                        .map((opt, i) => (
                          <span
                            key={i}
                            className="text-[11px] px-2 py-0.5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20"
                          >
                            {opt}
                          </span>
                        ))}
                    </div>
                  )}
                  <p className="text-xs text-[#6B7280]">Separate each option with a comma</p>
                </div>
              )}

              {/* Required toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <div>
                  <p className="text-sm font-medium text-white">Required Question</p>
                  <p className="text-xs text-[#6B7280]">Lead must answer to be qualified</p>
                </div>
                <Switch
                  checked={newQuestionRequired}
                  onCheckedChange={setNewQuestionRequired}
                  className="data-[state=checked]:bg-[#7C3AED]"
                />
              </div>

              {/* Preview */}
              {newQuestionText.trim() && (
                <div className="space-y-2">
                  <Label className="text-sm text-[#9CA3AF]">Preview</Label>
                  <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-[#7C3AED] p-1.5">
                        <Type className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-xs text-[#9CA3AF]">AI Bot asks:</span>
                    </div>
                    <div className="bg-[#7C3AED] rounded-2xl rounded-br-md px-4 py-2.5 text-sm text-white max-w-[85%] ml-auto">
                      {newQuestionText}
                      {newQuestionRequired && <span className="text-red-300 ml-0.5">*</span>}
                    </div>
                    {newQuestionType === 'Multiple Choice' && newOptions.trim() && (
                      <div className="flex flex-wrap gap-2 mt-2 ml-auto max-w-[85%] justify-end">
                        {newOptions
                          .split(',')
                          .map((o) => o.trim())
                          .filter(Boolean)
                          .map((opt, i) => (
                            <span
                              key={i}
                              className="text-xs px-3 py-1.5 rounded-full bg-white/[0.06] text-[#9CA3AF] border border-white/[0.08] hover:bg-white/[0.1] cursor-pointer transition-colors"
                            >
                              {opt}
                            </span>
                          ))}
                      </div>
                    )}
                    {newQuestionType !== 'Multiple Choice' && (
                      <div className="flex justify-end">
                        <div className="bg-white/[0.06] rounded-lg px-4 py-2 text-xs text-[#6B7280] w-48">
                          {newQuestionType === 'Text' && 'Lead types their answer...'}
                          {newQuestionType === 'Phone' && '(555) 000-0000'}
                          {newQuestionType === 'Email' && 'lead@email.com'}
                          {newQuestionType === 'Number' && 'Enter a number...'}
                          {newQuestionType === 'Date' && 'MM/DD/YYYY'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Add button */}
              <Button
                onClick={addQuestion}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-lg shadow-[#7C3AED]/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}