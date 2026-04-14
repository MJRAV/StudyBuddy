import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

type ToastVariant = 'success' | 'error' | 'info';

type ToastOptions = {
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastApi = {
  showToast: (message: string, options?: ToastOptions) => void;
};

type ToastState = {
  message: string;
  variant: ToastVariant;
  durationMs: number;
};

const ToastContext = createContext<ToastApi | null>(null);

const DEFAULT_DURATION_MS = 2200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
  }, []);

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }

    const nextToast: ToastState = {
      message,
      variant: options?.variant ?? 'info',
      durationMs: options?.durationMs ?? DEFAULT_DURATION_MS,
    };

    setToast(nextToast);
    setIsVisible(true);
    opacity.setValue(0);
    translateY.setValue(-16);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    hideTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -10,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsVisible(false);
      });
    }, nextToast.durationMs);
  }, [opacity, translateY]);

  const value = useMemo<ToastApi>(() => ({ showToast }), [showToast]);

  const toneStyle =
    toast?.variant === 'success'
      ? styles.toastSuccess
      : toast?.variant === 'error'
        ? styles.toastError
        : styles.toastInfo;

  return (
    <ToastContext.Provider value={value}>
      <View style={styles.root}>
        {children}
        {isVisible && toast ? (
          <View pointerEvents="none" style={styles.overlay}>
            <Animated.View style={[styles.toast, toneStyle, { opacity, transform: [{ translateY }] }]}> 
              <Text style={styles.toastText}>{toast.message}</Text>
            </Animated.View>
          </View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 54,
    left: 12,
    right: 12,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    minHeight: 44,
    maxWidth: 520,
    width: '100%',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  toastSuccess: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  toastError: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  toastInfo: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  toastText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});