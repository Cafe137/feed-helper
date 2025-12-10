import { ReactNode } from 'react'

interface Props {
    children: [ReactNode, ReactNode]
    lwidth: number
}

export function Row2({ children, lwidth }: Props) {
    return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: lwidth }}>{children[0]}</div>
            <div>{children[1]}</div>
        </div>
    )
}
