# 간편장부 관리 웹 앱

개인사업자를 위한 수입/지출 관리 및 종합소득세 신고 데이터 추출 도구

## 주요 기능

- ✅ 수입/지출 입력 및 관리
- ✅ 계정과목 자동 분류 (14가지 항목)
- ✅ 3.3% 원천징수 자동 계산
- ✅ 엑셀 파일 업로드 (신용카드 거래내역 자동 등록)
- ✅ 홈택스 신고 요약 데이터 제공
- ✅ CSV 다운로드
- ✅ 브라우저 로컬 저장 (새로고침해도 유지)

## Vercel 배포 방법

### 1단계: GitHub에 업로드

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/simple-bookkeeping.git
git push -u origin main
```

### 2단계: Vercel 배포

1. [Vercel](https://vercel.com)에 접속 후 로그인
2. "Add New Project" 클릭
3. GitHub 저장소 선택 (`simple-bookkeeping`)
4. "Deploy" 클릭

**배포 완료!** 자동으로 URL이 생성됩니다 (예: `https://simple-bookkeeping.vercel.app`)

## 로컬 실행 방법

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# http://localhost:3000 접속
```

## 기술 스택

- Next.js 14
- React 18
- Tailwind CSS
- SheetJS (엑셀 파일 처리)

## 사용법

1. **수입/지출 입력**: 날짜, 항목, 금액 입력 후 등록
2. **엑셀 업로드**: 신용카드 거래내역 엑셀 파일 업로드
3. **홈택스 요약**: 신고 시 필요한 합계 데이터 확인
4. **CSV 다운로드**: 엑셀에서 추가 분석

## 엑셀 파일 형식

다음 컬럼명 중 하나 이상 포함:

- **날짜**: 거래일시, 날짜, 거래일, 승인일시, Date
- **항목**: 가맹점명, 항목, 내용, 적요, Description
- **금액**: 거래금액, 금액, 승인금액, Amount

## 계정과목 자동 분류

항목명에 키워드가 포함되면 자동 분류:

- 노트북 → 소모품비
- 식비 → 복리후생비
- 월세 → 임차료
- 택시 → 차량유지비
- 광고 → 광고선전비
- 등등...

## 라이선스

MIT
