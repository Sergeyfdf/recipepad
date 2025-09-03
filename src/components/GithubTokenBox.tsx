// src/components/GithubTokenBox.tsx
import React from 'react';
import { getGhToken, setGhToken, clearGhToken } from '../lib/githubToken';

export default function GithubTokenBox() {
  const [v, setV] = React.useState(getGhToken() || '');

  return (
    <div className="card mt">
      <div className="card__body">
        <div className="subtitle">GitHub Token (PAT)</div>
        <input
          type="password"
          className="control"
          placeholder="ghp_xxx..."
          value={v}
          onChange={(e) => setV(e.target.value)}
        />
        <div className="row gap mt">
          <button
            className="btn btn-primary"
            onClick={() => {
              setGhToken(v);
              alert('Токен сохранён локально.');
            }}
          >
            Сохранить
          </button>
          <button
            className="btn"
            onClick={() => {
              clearGhToken();
              setV('');
              alert('Токен удалён.');
            }}
          >
            Удалить
          </button>
        </div>
        <div className="hint small">
          Токен хранится <b>только</b> в этом браузере (localStorage). Не коммить его в репозиторий.
        </div>
      </div>
    </div>
  );
}
