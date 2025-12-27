import React from 'react'
import { Card, CardBody, CardHeader } from '../modules/ui/Card'
import { Button } from '../modules/ui/Button'

export const Home: React.FC<{
    trackers: { id: string; name: string; description?: string }[]
    onClickAdmin: () => void
    onSelectTracker: (t: { id: string; name: string }) => void
}> = ({ trackers, onClickAdmin, onSelectTracker }) => {
    return (
        <div className="space-y-1">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img
                        src="/images/SplitWithAMY_Logo.png"
                        className="h-20 w-20 rounded"
                        alt="SplitWithAMY logo"
                    />
                    <h1 className="text-2xl font-bold">
                        Welcome to SplitWithAMY
                    </h1>
                </div>

                <Button variant="primary" onClick={onClickAdmin}>
                    Admin
                </Button>
            </div>

            {/* Description */}
            <div>
                <p className="text-sm text-gray-400">
                    SplitWithAMY helps groups track shared expenses, splits, and settlements with simple equal or custom splits.
                </p>
                <p className="text-sm text-gray-400">
                    View balances, audit entries, and quickly see who should pay whom to settle up.
                </p>
                <div className="mt-10">
                    <p className="text-sm text-gray-600">
                        Open existing tracker project or login as admin to manage trackers.
                    </p>
                </div>
            </div>

            {/* Trackers */}
            {trackers.length === 0 ? (
                <Card>
                    <CardBody>
                        <div className="text-center py-8">
                            <p className="text-gray-600">
                                No trackers yet. Login as admin to create one.
                            </p>
                        </div>
                    </CardBody>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {trackers.map((t) => (
                        <Card key={t.id}>
                            <CardHeader>
                                <h3 className="text-base font-semibold">{t.name}</h3>
                                {t.description && (
                                    <p className="text-xs text-gray-500">{t.description}</p>
                                )}
                            </CardHeader>
                            <CardBody>
                                <Button
                                    variant="secondary"
                                    onClick={() => onSelectTracker({ id: t.id, name: t.name })}
                                >
                                    Open
                                </Button>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}