import { Pack } from '../types/catalog';
import { clearCatalogCache } from './catalogService';

export async function subscribeAdminPacks(
  onUpdate: (packs: Pack[]) => void,
  onError: (err: Error) => void
): Promise<() => void> {
  const [{ db, handleFirestoreError, OperationType }, { collection, onSnapshot, orderBy, query }] =
    await Promise.all([import('./firebase'), import('firebase/firestore')]);

  const q = query(collection(db, 'packs'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const packs: Pack[] = snapshot.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          category: data.category === 'men' ? 'men' : 'women',
          name: (data.name as Pack['name']) || { fr: '', ar: '' },
          description: (data.description as Pack['description']) || { fr: '', ar: '' },
          price: Number(data.price || 0),
          active: typeof data.active === 'boolean' ? data.active : true,
          imageData: typeof data.imageData === 'string' && data.imageData ? data.imageData : undefined,
          imageUrl: typeof data.imageUrl === 'string' && data.imageUrl ? data.imageUrl : undefined,
        };
      });
      onUpdate(packs);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'packs');
      } catch (e) {
        onError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  );
}

export async function saveAdminPack(
  pack: Omit<Pack, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const [
    { db, handleFirestoreError, OperationType },
    { deleteField, doc, getDoc, serverTimestamp, setDoc, updateDoc },
  ] = await Promise.all([import('./firebase'), import('firebase/firestore')]);

  const rawId = pack.id?.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || `pack_${Date.now()}`;
  const id = rawId.slice(0, 128);
  const ref = doc(db, 'packs', id);

  const payload: Record<string, unknown> = {
    category: pack.category === 'men' ? 'men' : 'women',
    name: {
      fr: pack.name.fr.trim().slice(0, 160) || 'Pack',
      ar: (pack.name.ar || '').trim().slice(0, 160),
    },
    description: {
      fr: pack.description.fr.trim().slice(0, 2000),
      ar: (pack.description.ar || '').trim().slice(0, 2000),
    },
    price: Math.min(1000000, Math.max(0, Number(pack.price) || 0)),
    active: Boolean(pack.active),
    updatedAt: serverTimestamp(),
  };

  if (pack.imageData !== undefined && pack.imageData !== '') {
    payload.imageData = pack.imageData.slice(0, 600000);
  }
  if (pack.imageUrl !== undefined && pack.imageUrl !== '') {
    payload.imageUrl = pack.imageUrl.slice(0, 2048);
  }

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data();
      const updatePayload: Record<string, unknown> = { ...payload };
      if (!existingData.createdAt) {
        updatePayload.createdAt = serverTimestamp();
      }
      if (pack.imageUrl === '' && existingData.imageUrl) {
        updatePayload.imageUrl = deleteField();
      }
      if (pack.imageData === '' && existingData.imageData) {
        updatePayload.imageData = deleteField();
      }
      await updateDoc(ref, updatePayload);
    } else {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
    clearCatalogCache();
    return id;
  } catch (error) {
    return handleFirestoreError(error, OperationType.WRITE, `packs/${id}`);
  }
}

export async function toggleAdminPackActive(id: string, active: boolean): Promise<void> {
  const [{ db, handleFirestoreError, OperationType }, { doc, serverTimestamp, updateDoc }] =
    await Promise.all([import('./firebase'), import('firebase/firestore')]);

  try {
    await updateDoc(doc(db, 'packs', id), {
      active,
      updatedAt: serverTimestamp(),
    });
    clearCatalogCache();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `packs/${id}`);
  }
}

export async function deleteAdminPack(id: string): Promise<void> {
  const [{ db, handleFirestoreError, OperationType }, { deleteDoc, doc }] = await Promise.all([
    import('./firebase'),
    import('firebase/firestore'),
  ]);
  try {
    await deleteDoc(doc(db, 'packs', id));
    clearCatalogCache();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `packs/${id}`);
  }
}
