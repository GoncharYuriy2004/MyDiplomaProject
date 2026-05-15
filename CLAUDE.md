# MyDiplomaProject — Підсистема обліку та підтримання запасів запасних частин
## Повна назва: «Інформаційна система підтримки діяльності відділу IT-інфраструктури у складі промислового підприємства»

## Stack
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router v7 + Recharts + jsPDF
- **Backend:** Python FastAPI + MongoDB (motor async driver)

## Project Structure
```
src/
  pages/
    Login.tsx, Register.tsx
    manager/   # Manager role pages
    worker/    # Worker role pages
  components/
    DashboardLayout.tsx
    Sidebar.tsx
  context/     # React context providers
  data/        # Static data / mock data
  i18n/        # Internationalization
  utils/
backend/
  main.py      # FastAPI app entry point
  auth_utils.py
  requirements.txt
```

## Roles
- **manager** — управління складом
- **worker** — виконання завдань

## Dev Commands
```bash
# Frontend
npm run dev       # Vite dev server (default port 5173)
npm run build
npm run lint

# Backend
cd backend
uvicorn main:app --reload
```

## Key Notes
- Auth via JWT (OAuth2PasswordBearer)
- MongoDB на localhost:27017, db: it_wms, collection: users
- Frontend і backend запускаються окремо
