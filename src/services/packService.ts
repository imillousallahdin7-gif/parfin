import { Pack } from '../types/catalog';

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
          imageData: typeof data.imageData === 'string' ? data.imageData : undefined,
          imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
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
  const [{ db, handleFirestoreError, OperationType }, { doc, getDoc, serverTimestamp, setDoc, updateDoc }] =
    await Promise.all([import('./firebase'), import('firebase/firestore')]);

  const id = pack.id?.trim() || `pack_${Date.now()}`;
  const ref = doc(db, 'packs', id);

  const payload: Record<string, unknown> = {
    category: pack.category === 'men' ? 'men' : 'women',
    name: {
      fr: pack.name.fr.trim().slice(0, 160),
      ar: (pack.name.ar || '').trim().slice(0, 160),
    },
    description: {
      fr: pack.description.fr.trim().slice(0, 2000),
      ar: (pack.description.ar || '').trim().slice(0, 2000),
    },
    price: Math.max(0, Number(pack.price) || 0),
    active: Boolean(pack.active),
    updatedAt: serverTimestamp(),
  };

  if (pack.imageData !== undefined) payload.imageData = pack.imageData.slice(0, 600000);
  if (pack.imageUrl !== undefined) payload.imageUrl = pack.imageUrl.slice(0, 2048);

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data();
      await updateDoc(ref, {
        ...payload,
        createdAt: existingData.createdAt || serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
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
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `packs/${id}`);
  }
}
