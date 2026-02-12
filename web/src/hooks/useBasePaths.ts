import { useCallback } from 'react'

export function useBasePaths(serverBasePaths: string[] = []) {
    const getBasePaths = useCallback((): string[] => {
        return serverBasePaths
    }, [serverBasePaths])

    return {
        getBasePaths
    }
}
