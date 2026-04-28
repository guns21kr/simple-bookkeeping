'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export default function Home() {
  const [entries, setEntries] = useState([]);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: '지출',
    businessCode: '949909',
    withholding: false
  });
  const [uploadStatus, setUploadStatus] = useState('');

  // localStorage에서 데이터 불러오기
  useEffect(() => {
    const saved = localStorage.getItem('bookkeepingData');
    if (saved) {
      setEntries(JSON.parse(saved));
    }
  }, []);

  // 데이터 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem('bookkeepingData', JSON.stringify(entries));
  }, [entries]);

  // 계정과목 자동 분류
  const classifyAccount = (description) => {
    const text = description.toLowerCase();
    
    if (text.includes('식비') || text.includes('점심') || text.includes('저녁') || text.includes('회식')) return '복리후생비';
    if (text.includes('노트북') || text.includes('컴퓨터') || text.includes('키보드') || text.includes('마우스')) return '소모품비';
    if (text.includes('택시') || text.includes('기름') || text.includes('주차') || text.includes('통행료')) return '차량유지비';
    if (text.includes('전화') || text.includes('인터넷') || text.includes('통신')) return '통신비';
    if (text.includes('광고') || text.includes('홍보') || text.includes('마케팅')) return '광고선전비';
    if (text.includes('월세') || text.includes('임대료') || text.includes('사무실')) return '임차료';
    if (text.includes('급여') || text.includes('월급') || text.includes('인건비')) return '급여';
    if (text.includes('매입') || text.includes('재료') || text.includes('원재료')) return '매입비용';
    if (text.includes('전기') || text.includes('수도') || text.includes('가스')) return '수도광열비';
    if (text.includes('보험')) return '보험료';
    if (text.includes('접대') || text.includes('선물')) return '접대비';
    if (text.includes('세금')) return '세금과공과';
    if (text.includes('수리') || text.includes('수선')) return '수선비';
    
    return '기타';
  };

  // 원천징수 계산
  const calculateWithholding = (amount) => {
    const netAmount = Math.round(amount / 1.033);
    const tax = amount - netAmount;
    return { netAmount, tax };
  };

  // 입력 처리
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.description || !formData.amount) {
      alert('항목명과 금액을 입력해주세요.');
      return;
    }

    let finalAmount = parseFloat(formData.amount);
    let withholdingTax = 0;

    if (formData.type === '수입' && formData.withholding) {
      const { netAmount, tax } = calculateWithholding(finalAmount);
      withholdingTax = tax;
    }

    const newEntry = {
      id: Date.now(),
      date: formData.date,
      description: formData.description,
      account: classifyAccount(formData.description),
      amount: finalAmount,
      type: formData.type,
      businessCode: formData.businessCode,
      withholding: formData.withholding,
      withholdingTax: withholdingTax
    };

    setEntries([newEntry, ...entries]);
    
    // 폼 초기화
    setFormData({
      ...formData,
      description: '',
      amount: '',
      withholding: false
    });
  };

  // 삭제
  const handleDelete = (id) => {
    if (confirm('이 항목을 삭제하시겠습니까?')) {
      setEntries(entries.filter(entry => entry.id !== id));
    }
  };

  // 엑셀 파일 업로드 처리
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadStatus('파일 읽는 중...');
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let imported = 0;
        let skipped = 0;

        jsonData.forEach((row) => {
          const date = row['거래일시'] || row['날짜'] || row['거래일'] || row['승인일시'] || row['Date'];
          const description = row['가맹점명'] || row['항목'] || row['내용'] || row['적요'] || row['Description'];
          const amount = row['거래금액'] || row['금액'] || row['승인금액'] || row['Amount'];
          
          if (!description || !amount) {
            skipped++;
            return;
          }

          let formattedDate = new Date().toISOString().split('T')[0];
          if (date) {
            try {
              let dateObj;
              if (typeof date === 'string') {
                const cleaned = date.replace(/[^\d]/g, '');
                if (cleaned.length === 8) {
                  dateObj = new Date(
                    cleaned.substring(0, 4),
                    cleaned.substring(4, 6) - 1,
                    cleaned.substring(6, 8)
                  );
                }
              } else if (typeof date === 'number') {
                dateObj = new Date((date - 25569) * 86400 * 1000);
              }
              
              if (dateObj && !isNaN(dateObj.getTime())) {
                formattedDate = dateObj.toISOString().split('T')[0];
              }
            } catch (err) {
              console.log('날짜 변환 실패:', date);
            }
          }

          let numAmount = 0;
          if (typeof amount === 'number') {
            numAmount = Math.abs(amount);
          } else if (typeof amount === 'string') {
            numAmount = Math.abs(parseFloat(amount.replace(/[^\d.-]/g, '')) || 0);
          }

          if (numAmount > 0) {
            const newEntry = {
              id: Date.now() + imported,
              date: formattedDate,
              description: String(description).trim(),
              account: classifyAccount(String(description)),
              amount: numAmount,
              type: '지출',
              businessCode: '949909',
              withholding: false,
              withholdingTax: 0
            };

            setEntries(prev => [newEntry, ...prev]);
            imported++;
          } else {
            skipped++;
          }
        });

        setUploadStatus(`✅ ${imported}건 등록 완료${skipped > 0 ? ` (${skipped}건 생략)` : ''}`);
        setTimeout(() => setUploadStatus(''), 3000);

      } catch (error) {
        setUploadStatus('❌ 파일 처리 실패: ' + error.message);
        console.error('엑셀 파일 처리 오류:', error);
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // 홈택스 요약 계산
  const calculateSummary = () => {
    const summary = {
      총수입_949909: 0,
      총수입_743002: 0,
      원천징수세액: 0,
      경비: {}
    };

    entries.forEach(entry => {
      if (entry.type === '수입') {
        if (entry.businessCode === '949909') {
          summary.총수입_949909 += entry.amount;
        } else {
          summary.총수입_743002 += entry.amount;
        }
        
        if (entry.withholding) {
          summary.원천징수세액 += entry.withholdingTax;
        }
      } else {
        if (!summary.경비[entry.account]) {
          summary.경비[entry.account] = 0;
        }
        summary.경비[entry.account] += entry.amount;
      }
    });

    return summary;
  };

  const summary = calculateSummary();

  // CSV 다운로드
  const downloadCSV = () => {
    const headers = ['날짜', '항목', '계정과목', '금액', '유형', '업종코드', '원천징수', '원천징수세액'];
    const rows = entries.map(e => [
      e.date,
      e.description,
      e.account,
      e.amount,
      e.type,
      e.businessCode,
      e.withholding ? 'Y' : 'N',
      e.withholdingTax || 0
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `간편장부_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // 데이터 초기화
  const clearData = () => {
    if (confirm('모든 데이터를 삭제하시겠습니까? (복구 불가)')) {
      setEntries([]);
      localStorage.removeItem('bookkeepingData');
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '24px', fontWeight: '500', marginBottom: '0.5rem' }}>간편장부 관리</h1>
      <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
        개인사업자 수입/지출 기록 및 종합소득세 신고 데이터 추출
      </p>

      {/* 입력 폼 */}
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '500' }}>수입/지출 입력</h2>
          
          <label style={{ 
            padding: '8px 16px', 
            fontSize: '14px', 
            fontWeight: '500',
            background: 'var(--color-background-success)',
            color: 'var(--color-text-success)',
            border: '0.5px solid var(--color-border-success)',
            borderRadius: 'var(--border-radius-md)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            📊 엑셀 파일 업로드
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {uploadStatus && (
          <div style={{ 
            padding: '12px', 
            marginBottom: '1rem',
            background: uploadStatus.includes('❌') ? 'var(--color-background-danger)' : 'var(--color-background-success)',
            color: uploadStatus.includes('❌') ? 'var(--color-text-danger)' : 'var(--color-text-success)',
            borderRadius: 'var(--border-radius-md)',
            fontSize: '14px'
          }}>
            {uploadStatus}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>날짜</label>
              <input 
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                style={{ width: '100%' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>유형</label>
              <select 
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value, withholding: false})}
                style={{ width: '100%' }}
              >
                <option value="수입">수입</option>
                <option value="지출">지출</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>업종코드</label>
              <select 
                value={formData.businessCode}
                onChange={(e) => setFormData({...formData, businessCode: e.target.value})}
                style={{ width: '100%' }}
              >
                <option value="949909">949909 - 기타 서비스업</option>
                <option value="743002">743002 - 사진 촬영 및 처리업</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>항목명</label>
              <input 
                type="text" 
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="예: 노트북, 월세, 식비, 매출 등"
                style={{ width: '100%' }}
                required
              />
              {formData.description && (
                <p style={{ fontSize: '12px', color: 'var(--color-text-info)', marginTop: '4px' }}>
                  → 계정과목: {classifyAccount(formData.description)}
                </p>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>금액 (원)</label>
              <input 
                type="number" 
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                placeholder="0"
                style={{ width: '100%' }}
                required
              />
            </div>
          </div>

          {formData.type === '수입' && (
            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.withholding}
                  onChange={(e) => setFormData({...formData, withholding: e.target.checked})}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontSize: '14px' }}>3.3% 원천징수 적용</span>
              </label>
              
              {formData.withholding && formData.amount && (
                <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  <p>세전 금액: {parseInt(formData.amount).toLocaleString()}원</p>
                  <p>세후 실수령: {calculateWithholding(parseFloat(formData.amount)).netAmount.toLocaleString()}원</p>
                  <p>원천징수세액: {calculateWithholding(parseFloat(formData.amount)).tax.toLocaleString()}원</p>
                </div>
              )}
            </div>
          )}

          <button type="submit" style={{ width: '100%', padding: '0.75rem', fontSize: '15px', fontWeight: '500' }}>
            등록하기
          </button>
        </form>
      </div>

      {/* 통계 요약 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '1rem' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>총 수입 (949909)</p>
          <p style={{ fontSize: '24px', fontWeight: '500', color: 'var(--color-text-success)' }}>
            {summary.총수입_949909.toLocaleString()}원
          </p>
        </div>
        
        <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '1rem' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>총 수입 (743002)</p>
          <p style={{ fontSize: '24px', fontWeight: '500', color: 'var(--color-text-success)' }}>
            {summary.총수입_743002.toLocaleString()}원
          </p>
        </div>
        
        <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '1rem' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>원천징수세액</p>
          <p style={{ fontSize: '24px', fontWeight: '500', color: 'var(--color-text-info)' }}>
            {Math.round(summary.원천징수세액).toLocaleString()}원
          </p>
        </div>
        
        <div style={{ background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', padding: '1rem' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>총 거래</p>
          <p style={{ fontSize: '24px', fontWeight: '500' }}>{entries.length}건</p>
        </div>
      </div>

      {/* 홈택스 요약 */}
      <div style={{ background: 'var(--color-background-info)', border: '0.5px solid var(--color-border-info)', borderRadius: 'var(--border-radius-lg)', padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '1rem', color: 'var(--color-text-info)' }}>📊 홈택스 신고 요약</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '500', marginBottom: '0.5rem', color: 'var(--color-text-info)' }}>수입금액</h3>
            <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>업종 949909:</span>
                <strong>{summary.총수입_949909.toLocaleString()}원</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>업종 743002:</span>
                <strong>{summary.총수입_743002.toLocaleString()}원</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '4px', borderTop: '0.5px solid var(--color-border-info)' }}>
                <span>합계:</span>
                <strong>{(summary.총수입_949909 + summary.총수입_743002).toLocaleString()}원</strong>
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '500', marginBottom: '0.5rem', color: 'var(--color-text-info)' }}>필요경비 (계정과목별)</h3>
            <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
              {Object.keys(summary.경비).length === 0 ? (
                <p style={{ color: 'var(--color-text-secondary)' }}>지출 내역 없음</p>
              ) : (
                Object.entries(summary.경비)
                  .sort((a, b) => b[1] - a[1])
                  .map(([account, amount]) => (
                    <div key={account} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{account}:</span>
                      <strong>{amount.toLocaleString()}원</strong>
                    </div>
                  ))
              )}
              {Object.keys(summary.경비).length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', paddingTop: '4px', borderTop: '0.5px solid var(--color-border-info)' }}>
                  <span>합계:</span>
                  <strong>{Object.values(summary.경비).reduce((a, b) => a + b, 0).toLocaleString()}원</strong>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: '15px', fontWeight: '500', marginBottom: '0.5rem', color: 'var(--color-text-info)' }}>기납부세액</h3>
            <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>원천징수세액:</span>
                <strong>{Math.round(summary.원천징수세액).toLocaleString()}원</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 데이터 관리 버튼 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '2rem' }}>
        <button onClick={downloadCSV} style={{ flex: 1 }}>
          CSV 다운로드
        </button>
        <button onClick={clearData} style={{ flex: 1, background: 'var(--color-background-danger)', color: 'var(--color-text-danger)' }}>
          전체 삭제
        </button>
      </div>

      {/* 거래 내역 테이블 */}
      <div style={{ background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '500' }}>거래 내역</h2>
        </div>
        
        {entries.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <p>등록된 거래 내역이 없습니다.</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>위의 폼에서 수입/지출을 입력해보세요.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '14px' }}>
              <thead style={{ background: 'var(--color-background-secondary)' }}>
                <tr>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: 'var(--color-text-secondary)' }}>날짜</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: 'var(--color-text-secondary)' }}>항목</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500', color: 'var(--color-text-secondary)' }}>계정과목</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500', color: 'var(--color-text-secondary)' }}>금액</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '500', color: 'var(--color-text-secondary)' }}>유형</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '500', color: 'var(--color-text-secondary)' }}>업종</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '500', color: 'var(--color-text-secondary)' }}>원천징수</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '500', color: 'var(--color-text-secondary)' }}>삭제</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={entry.id} style={{ borderBottom: index < entries.length - 1 ? '0.5px solid var(--color-border-tertiary)' : 'none' }}>
                    <td style={{ padding: '12px 16px' }}>{entry.date}</td>
                    <td style={{ padding: '12px 16px' }}>{entry.description}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px',
                        background: 'var(--color-background-secondary)',
                        color: 'var(--color-text-secondary)'
                      }}>
                        {entry.account}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>
                      {entry.amount.toLocaleString()}원
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        background: entry.type === '수입' ? 'var(--color-background-success)' : 'var(--color-background-secondary)',
                        color: entry.type === '수입' ? 'var(--color-text-success)' : 'var(--color-text-secondary)'
                      }}>
                        {entry.type}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      {entry.businessCode}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {entry.withholding ? (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-info)' }}>
                          {entry.withholdingTax.toLocaleString()}원
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleDelete(entry.id)}
                        style={{ 
                          padding: '4px 12px', 
                          fontSize: '13px',
                          background: 'transparent',
                          color: 'var(--color-text-danger)',
                          border: '0.5px solid var(--color-border-danger)'
                        }}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 사용 안내 */}
      <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--color-background-secondary)', borderRadius: 'var(--border-radius-md)', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        <p style={{ marginBottom: '8px', fontWeight: '500', color: 'var(--color-text-primary)' }}>💡 사용 안내</p>
        <ul style={{ lineHeight: '1.8', paddingLeft: '1.5rem' }}>
          <li>항목명에 키워드를 입력하면 계정과목이 자동으로 분류됩니다 (예: "노트북" → 소모품비)</li>
          <li>수입 입력 시 원천징수 체크박스를 선택하면 3.3% 세액이 자동 계산됩니다</li>
          <li><strong>엑셀 파일 업로드:</strong> 신용카드 거래내역 엑셀을 업로드하면 자동으로 분류되어 등록됩니다</li>
          <li>엑셀 파일은 "거래일시/날짜", "가맹점명/항목", "거래금액/금액" 컬럼이 필요합니다</li>
          <li>모든 데이터는 브라우저에 저장되어 새로고침해도 유지됩니다</li>
          <li>홈택스 요약본을 참고하여 종합소득세 신고 시 활용하세요</li>
          <li>CSV 다운로드로 엑셀에서 추가 분석이 가능합니다</li>
        </ul>
      </div>
    </div>
  );
}
