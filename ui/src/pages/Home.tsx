import React from 'react'
import { Card, CardBody, CardHeader } from '../modules/ui/Card'
import { Button } from '../modules/ui/Button'

export const Home: React.FC<{
    trackers: { id: string; name: string; description?: string }[]
    loading?: boolean
    onClickAdmin: () => void
    onSelectTracker: (t: { id: string; name: string }) => void
}> = ({ trackers, loading = false, onClickAdmin, onSelectTracker }) => {
    const features = [
        { t: 'Fast entry', d: 'Add expenses in seconds with equal or custom splits.', icon: (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
        ) },
        { t: 'Clear balances', d: 'See who owes whom with instant settlements.', icon: (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10h18M7 6h10M7 14h10M5 18h14"/></svg>
        ) },
        { t: 'Mobile-first', d: 'Optimized for quick use on mobile browsers.', icon: (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="7" y="2" width="10" height="20" rx="2"/></svg>
        ) }
    ]

    const featureBorderColors = ['border-indigo-300 dark:border-indigo-500/60', 'border-purple-300 dark:border-purple-500/60', 'border-pink-300 dark:border-pink-500/60']

    return (
        <div className="space-y-6">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                <div className="px-4 py-8 sm:px-6 sm:py-10 flex items-center justify-between gap-4">
                    {/* Left: Title */}
                    <div className="flex flex-col gap-2 text-white max-w-[60%] sm:max-w-[65%]">
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow">Split-with-AMY</h1>
                        <p className="text-xs sm:text-sm opacity-90 leading-snug">
                            <span className="block">Track shared expenses, split fairly,</span>
                            <span className="block">and settle effortlessly.</span>
                        </p>
                    </div>
                    {/* Right: Logo */}
                    <div className="flex items-center gap-4 shrink-0">
                        <img src="/logo.png" className="h-10 w-20 sm:h-10 sm:w-20 rounded-md object-contain" alt="SplitWithAMY logo" />
                    </div>
                </div>
            </div>

            {/* Features - glassmorphism tiles with icon badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {features.map((f, i) => (
                    <div key={i} className={`rounded-xl p-4 bg-gradient-to-br from-white/70 to-white/40 dark:from-gray-900/50 dark:to-gray-800/40 backdrop-blur border shadow-sm transition hover:shadow-md hover:-translate-y-0.5 ${featureBorderColors[i % featureBorderColors.length]}`}>
                        <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm dark:bg-indigo-500">
                                {f.icon}
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold">{f.t}</h3>
                                <p className="text-xs text-gray-700 dark:text-gray-400">{f.d}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Trackers header with Admin button on the right */}
            <div id="trackers" className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Your trackers</h2>
                    <Button onClick={onClickAdmin} className="bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500">Admin</Button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, idx) => (
                            <Card key={idx}>
                                <CardHeader>
                                    <div className="h-5 w-1/3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                                </CardHeader>
                                <CardBody>
                                    <div className="h-8 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                ) : trackers.length === 0 ? (
                    <Card>
                        <CardBody>
                            <div className="text-center py-12">
                                <p className="text-gray-700 dark:text-gray-300">No trackers yet. Login as admin to create one.</p>
                                <Button onClick={onClickAdmin} className="mt-3">Go to Admin</Button>
                            </div>
                        </CardBody>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {trackers.map((t) => (
                            <Card key={t.id} className="group transition hover:-translate-y-1 hover:shadow-xl">
                                <CardHeader className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-base font-semibold group-hover:text-indigo-600">{t.name}</h3>
                                            {t.description && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{t.description}</p>
                                            )}
                                        </div>
                                        <span className="text-[10px] px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">Tracker</span>
                                    </div>
                                </CardHeader>
                                <CardBody>
                                    <div className="flex items-center justify-between">
                                        <Button
                                            variant="secondary"
                                            onClick={() => onSelectTracker({ id: t.id, name: t.name })}
                                            className="transition hover:scale-[1.02] bg-green-600 text-white hover:bg-green-700 focus:ring-green-500"
                                        >
                                            Open
                                        </Button>
                                    </div>
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}