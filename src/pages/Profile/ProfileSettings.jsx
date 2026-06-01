import { useState, useRef } from 'react';
import { updateProfile } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { updateUserProfile } from '../../services/userService';
import { uploadAvatarToCloudinary } from '../../services/cloudinaryService';
import Avatar from '../../components/avatars/Avatar';
import styles from './Profile.module.css';

function displayNameFromParts(firstName, lastName, name) {
  if (name?.trim()) return name.trim();
  return [firstName, lastName].filter(Boolean).join(' ').trim();
}

export default function ProfileSettings() {
  const { user, refreshProfile } = useAuth();
  const fileInputRef = useRef(null);

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [name, setName] = useState(user?.name || '');
  const [birthday, setBirthday] = useState(user?.birthday || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!user) return null;

  const resolvedName = displayNameFromParts(firstName, lastName, name);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file');
      return;
    }
    setError('');
    setSuccess('');
    setUploading(true);
    try {
      const url = await uploadAvatarToCloudinary(file, user.uid);
      setPhotoURL(url);
      setSuccess('Photo uploaded. Save profile to apply.');
    } catch (err) {
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const profileData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: resolvedName || user.email?.split('@')[0] || 'User',
      birthday: birthday || '',
      bio: bio.trim(),
      photoURL: photoURL || ''
    };

    try {
      await updateUserProfile(user.uid, profileData);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: profileData.name,
          photoURL: profileData.photoURL || null
        });
      }

      await refreshProfile();
      setSuccess('Profile saved');
    } catch (err) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.card}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.avatarSection}>
          <Avatar
            name={resolvedName}
            email={user.email}
            photoURL={photoURL}
            size="large"
          />
          <div className={styles.avatarActions}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles.fileInput}
              onChange={handleAvatarChange}
              disabled={uploading}
            />
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Change photo'}
            </button>
            {photoURL && (
              <button
                type="button"
                className={styles.textBtn}
                onClick={() => {
                  setPhotoURL('');
                  setSuccess('Photo removed. Save profile to apply.');
                }}
              >
                Remove photo
              </button>
            )}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="firstName">First name</label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="lastName">Last name</label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="displayName">Display name</label>
          <input
            id="displayName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={displayNameFromParts(firstName, lastName, '') || 'Shown in chats'}
          />
          <span className={styles.hint}>
            Leave empty to use first and last name
          </span>
        </div>

        <div className={styles.field}>
          <label htmlFor="birthday">Birthday</label>
          <input
            id="birthday"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A few words about you"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={user.email} disabled />
          <span className={styles.hint}>Email cannot be changed here</span>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <button type="submit" className={styles.primaryBtn} disabled={saving || uploading}>
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}
